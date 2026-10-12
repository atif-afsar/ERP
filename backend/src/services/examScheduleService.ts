import type {Request} from 'express';
import {transaction} from '../db.js';
import {AppError} from '../middleware/errorHandler.js';
import {writeAudit} from './auditService.js';
export async function createExamSchedule(req:Request){
 try{return await transaction(async c=>{
  // Serialize scheduling within an institute before taking a fresh snapshot.
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('exam-schedules:'||$1::text,0))",[req.tenantId]);
  const exam=(await c.query('SELECT *, start_date::text AS start_date_str, end_date::text AS end_date_str FROM exams WHERE id=$1 AND tenant_id=$2 FOR SHARE',[req.params.id,req.tenantId])).rows[0];
  if(!exam)throw new AppError('Exam not found.',404,'NOT_FOUND');
  if(exam.status==='PUBLISHED')throw new AppError('Published exam schedules are locked.',409,'SCHEDULES_LOCKED');
  const b=req.body;
  const examStart=exam.start_date_str?.slice(0,10)||(exam.start_date instanceof Date?exam.start_date.toISOString().slice(0,10):String(exam.start_date).slice(0,10));
  const examEnd=exam.end_date_str?.slice(0,10)||(exam.end_date instanceof Date?exam.end_date.toISOString().slice(0,10):String(exam.end_date).slice(0,10));
  if(b.examDate<examStart||b.examDate>examEnd)throw new AppError('Schedule date must be within the exam date range.',422,'INVALID_EXAM_DATE');
  if(!(await c.query('SELECT id FROM subjects WHERE id=$1 AND tenant_id=$2',[b.subjectId,req.tenantId])).rowCount)throw new AppError('Subject must belong to this institution.',422,'INVALID_SUBJECT');
  const row=(await c.query(`INSERT INTO exam_subjects(tenant_id,exam_id,subject_id,class_id,exam_date,start_time,end_time,duration_minutes,max_marks,pass_marks,room,instructions) VALUES($1,$2,$3,$4,$5,$6,$7,EXTRACT(EPOCH FROM ($7::time-$6::time))/60,$8,$9,$10,$11) RETURNING *,exam_date::text AS exam_date`,[req.tenantId,exam.id,b.subjectId,exam.class_id,b.examDate,b.startTime,b.endTime,b.maxMarks,b.passMarks,b.room?.trim()||null,b.instructions||null])).rows[0];
  await writeAudit({tenantId:req.tenantId!,userId:req.user.id,action:'EXAM_SCHEDULE_CREATED',module:'exams',entityId:row.id,details:b,request:req},c);
  return row;
 });}catch(error:any){
  const conflicts:Record<string,[string,string]>={exam_schedule_duplicate_subject:['EXAM_SUBJECT_ALREADY_SCHEDULED','This subject already has a schedule in this exam.'],exam_schedule_class_overlap:['EXAM_CLASS_TIME_CONFLICT','This class or section already has an exam during that time.'],exam_schedule_room_overlap:['EXAM_ROOM_TIME_CONFLICT','This room already has an exam during that time.'],exam_schedule_locked:['SCHEDULES_LOCKED','Published exam schedules are locked.']};
  const conflict=conflicts[error.constraint];if(conflict)throw new AppError(conflict[1],409,conflict[0]);throw error;
 }
}
