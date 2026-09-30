import type pg from 'pg';
import type { Request } from 'express';
import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';

export async function requireTeachingScope(req:Request, academicYearId:string, classId:string, sectionId?:string|null, subjectId?:string|null, client?:pg.PoolClient){
  if(req.user.isSuperAdmin||req.user.role==='TENANT_ADMIN') return;
  const run=client?client.query.bind(client):query;
  const result=await run(`SELECT 1 FROM staff s JOIN teacher_subject_assignments a ON a.teacher_id=s.id AND a.tenant_id=s.tenant_id
    WHERE s.tenant_id=$1 AND s.user_id=$2 AND s.status='ACTIVE' AND a.academic_year_id=$3 AND a.class_id=$4
      AND (a.section_id IS NULL OR a.section_id=$5) AND ($6::uuid IS NULL OR a.subject_id=$6) LIMIT 1`,
    [req.tenantId,req.user.id,academicYearId,classId,sectionId||null,subjectId||null]);
  if(!result.rowCount) throw new AppError('Teachers may access only assigned classes and subjects.',403,'TEACHING_SCOPE_DENIED');
}
