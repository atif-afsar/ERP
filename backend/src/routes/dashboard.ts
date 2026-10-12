import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
const router=Router();
router.get('/summary',(req,res,next)=>req.user.isSuperAdmin?next():tenantContext(true)(req,res,next),asyncHandler(async(req,res)=>{
 const date=z.string().date().safeParse(req.query.date||new Date().toISOString().slice(0,10));
 if(!date.success)throw new AppError('Use a valid YYYY-MM-DD date.',422,'INVALID_DATE');
 const data=await transaction(async c=>{
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const scalar=async(sql:string,args:any[]=[])=>Number((await c.query(sql,args)).rows[0].n);
  const role=req.user.role;const tenant=req.tenantId;const user=req.user.id;
  const result:any={role,date:date.data,scope:'All academic years in this institute',metrics:{},children:[]};
  if(req.user.isSuperAdmin){result.scope='Platform totals';result.metrics.totalInstitutes=await scalar('SELECT COUNT(*) n FROM tenants');result.metrics.activeInstitutes=await scalar("SELECT COUNT(*) n FROM tenants WHERE status='active'");result.metrics.totalStudents=await scalar('SELECT COUNT(*) n FROM students');return result;}
  const permissions=new Set((await c.query(`SELECT p.key FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id JOIN permissions p ON p.id=rp.permission_id WHERE m.user_id=$1 AND m.tenant_id=$2 AND m.status='active'`,[user,tenant])).rows.map(x=>x.key));
  const attendance=async(where:string,args:any[])=>{const r=(await c.query(`SELECT COUNT(*) FILTER(WHERE a.status!='EXCUSED')::int recorded, COUNT(*) FILTER(WHERE a.status IN ('PRESENT','LATE'))::int present,COUNT(*) FILTER(WHERE a.status='ABSENT')::int absent,COUNT(*) FILTER(WHERE a.status='HALF_DAY')::int half_days FROM attendance_records a WHERE a.tenant_id=$1 AND ${where}`,[tenant,...args])).rows[0];return {...r,percentage:r.recorded?Math.round((r.present+r.half_days*0.5)/r.recorded*1000)/10:null};};
  const fees=async(where:string,args:any[])=>{const assigned=await scalar(`SELECT COALESCE(SUM(f.total_amount),0) n FROM fee_assignments f WHERE f.tenant_id=$1 AND ${where}`,[tenant,...args]);const paid=await scalar(`SELECT COALESCE(SUM(p.amount),0) n FROM payments p JOIN fee_assignments f ON f.id=p.fee_assignment_id AND f.tenant_id=p.tenant_id WHERE p.tenant_id=$1 AND p.status='COMPLETED' AND ${where}`,[tenant,...args]);return {assigned,paid,outstanding:Math.max(0,assigned-paid),percentage:assigned?Math.round(paid/assigned*1000)/10:0};};
  if(role==='PARENT'||role==='STUDENT'){
   const own=role==='STUDENT'?'s.user_id=$2':`EXISTS(SELECT 1 FROM parent_students ps JOIN parents p ON p.id=ps.parent_id AND p.tenant_id=ps.tenant_id WHERE ps.student_id=s.id AND ps.tenant_id=s.tenant_id AND p.user_id=$2)`;
   const children=(await c.query(`SELECT s.id,s.admission_no,s.first_name,s.last_name,s.status,e.roll_no,c.name class_name,sec.name section_name,y.name academic_year_name FROM students s LEFT JOIN LATERAL(SELECT * FROM enrollments e WHERE e.student_id=s.id AND e.tenant_id=s.tenant_id AND e.status='enrolled' AND e.start_date<=$3 AND (e.end_date IS NULL OR e.end_date>=$3) ORDER BY e.start_date DESC,e.enrolled_at DESC,e.id DESC LIMIT 1)e ON true LEFT JOIN classes c ON c.id=e.class_id AND c.tenant_id=s.tenant_id LEFT JOIN sections sec ON sec.id=e.section_id AND sec.tenant_id=s.tenant_id LEFT JOIN academic_years y ON y.id=e.academic_year_id AND y.tenant_id=s.tenant_id WHERE s.tenant_id=$1 AND ${own} ORDER BY s.first_name,s.id`,[tenant,user,date.data])).rows;
   for(const child of children){child.fees=await fees('f.student_id=$2',[child.id]);child.attendance=await attendance('a.student_id=$2 AND a.attendance_date<=$3',[child.id,date.data]);child.today=await attendance('a.student_id=$2 AND a.attendance_date=$3',[child.id,date.data]);}
   result.children=children;result.scope=role==='PARENT'?'Linked children only':'Your student identity only';return result;
  }
  if(role==='TEACHER'){
   result.scope='Your active teacher profile and assignments';
   result.metrics.assignedClasses=await scalar(`SELECT COUNT(DISTINCT a.class_id) n FROM teacher_subject_assignments a JOIN staff s ON s.id=a.teacher_id AND s.tenant_id=a.tenant_id WHERE s.tenant_id=$1 AND s.user_id=$2 AND s.status='ACTIVE'`,[tenant,user]);
   result.schedule=(await c.query(`SELECT t.id,t.start_time,t.end_time,cl.name class_name,sec.name section_name,sub.name subject_name FROM timetable_entries t JOIN staff s ON s.id=t.teacher_id AND s.tenant_id=t.tenant_id JOIN academic_years ay ON ay.id=t.academic_year_id AND ay.tenant_id=t.tenant_id JOIN classes cl ON cl.id=t.class_id AND cl.tenant_id=t.tenant_id JOIN sections sec ON sec.id=t.section_id AND sec.tenant_id=t.tenant_id JOIN subjects sub ON sub.id=t.subject_id AND sub.tenant_id=t.tenant_id WHERE t.tenant_id=$1 AND s.user_id=$2 AND s.status='ACTIVE' AND t.day_of_week=EXTRACT(ISODOW FROM $3::date) AND $3::date BETWEEN ay.start_date AND ay.end_date AND EXISTS(SELECT 1 FROM teacher_subject_assignments a WHERE a.tenant_id=t.tenant_id AND a.teacher_id=t.teacher_id AND a.class_id=t.class_id AND a.academic_year_id=t.academic_year_id AND a.subject_id=t.subject_id AND (a.section_id IS NULL OR a.section_id=t.section_id)) ORDER BY t.start_time`,[tenant,user,date.data])).rows;result.metrics.todaySessions=result.schedule.length;return result;
  }
  if(permissions.has('student_lifecycle.view'))result.metrics.totalStudents=await scalar("SELECT COUNT(*) n FROM students WHERE tenant_id=$1 AND status='ACTIVE'",[tenant]);
  if(permissions.has('staff.view'))result.metrics.activeStaff=await scalar("SELECT COUNT(*) n FROM staff WHERE tenant_id=$1 AND status='ACTIVE'",[tenant]);
  if(permissions.has('attendance.view')&&(role==='TENANT_ADMIN'||permissions.has('attendance.manage')))result.attendance=await attendance('a.attendance_date=$2',[date.data]);
  if(permissions.has('fee_management.view'))result.fees=await fees('TRUE',[]);
  return result;
 });
 res.json({data,requestId:req.id,timestamp:new Date().toISOString()});
}));
export default router;
