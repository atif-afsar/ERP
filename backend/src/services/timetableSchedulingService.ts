import type {Request} from 'express';
import {transaction} from '../db.js';
import {AppError} from '../middleware/errorHandler.js';
import {writeAudit} from './auditService.js';
export async function saveTimetableEntry(req:Request,editing=false){
 try{return await transaction(async c=>{
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('timetable:'||$1::text,0))",[req.tenantId]);
  if(editing&&!(await c.query('SELECT id FROM timetable_entries WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId])).rowCount)throw new AppError('Timetable entry not found.',404,'NOT_FOUND');
  const b=req.body;
  const assigned=await c.query(`SELECT a.id FROM teacher_subject_assignments a JOIN staff s ON s.id=a.teacher_id AND s.tenant_id=a.tenant_id JOIN sections sec ON sec.id=$6 AND sec.class_id=a.class_id AND sec.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.teacher_id=$2 AND a.subject_id=$3 AND a.class_id=$4 AND a.academic_year_id=$5 AND (a.section_id IS NULL OR a.section_id=$6) AND s.status='ACTIVE' FOR SHARE OF a,s`,[req.tenantId,b.teacherId,b.subjectId,b.classId,b.academicYearId,b.sectionId]);
  if(!assigned.rowCount)throw new AppError('An active teacher must be assigned to this subject, class and section.',422,'INVALID_TEACHER_ASSIGNMENT');
  const params=[req.tenantId,b.academicYearId,b.classId,b.sectionId,b.subjectId,b.teacherId,b.dayOfWeek,b.startTime,b.endTime,b.room?.trim()||null];
  const row=(await c.query(editing?`UPDATE timetable_entries SET academic_year_id=$2,class_id=$3,section_id=$4,subject_id=$5,teacher_id=$6,day_of_week=$7,start_time=$8,end_time=$9,room=$10,updated_at=NOW() WHERE tenant_id=$1 AND id=$11 RETURNING *`:`INSERT INTO timetable_entries(tenant_id,academic_year_id,class_id,section_id,subject_id,teacher_id,day_of_week,start_time,end_time,room) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,editing?[...params,req.params.id]:params)).rows[0];
  await writeAudit({tenantId:req.tenantId!,userId:req.user.id,action:editing?'TIMETABLE_ENTRY_UPDATED':'TIMETABLE_ENTRY_CREATED',module:'timetable',entityId:row.id,details:b,request:req},c);return row;
 });}catch(e:any){if(e.code==='23505'||e.constraint==='timetable_interval_conflict')throw new AppError('Teacher, section or room is already booked during this time.',409,'TIMETABLE_CONFLICT');throw e;}
}
