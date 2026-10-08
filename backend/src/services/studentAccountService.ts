import type { Request } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { transaction } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from './auditService.js';
import { enqueueNotification } from './notificationService.js';
import { config } from '../config.js';

async function lockStudent(client:any,req:Request){
 const result=await client.query('SELECT * FROM students WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId]);
 if(!result.rowCount)throw new AppError('Student not found.',404,'NOT_FOUND');
 if(result.rows[0].user_id)throw new AppError('Student already has a linked account.',409,'STUDENT_ALREADY_LINKED');
 return result.rows[0];
}
export async function createStudentInvitation(req:Request){
 const email=req.body.email.trim().toLowerCase();const token=randomBytes(32).toString('base64url');
 return transaction(async client=>{
  const student=await lockStudent(client,req);
  if((await client.query('SELECT id FROM users WHERE lower(email)=$1',[email])).rowCount)throw new AppError('Account already exists. Use Link existing Student account after verifying its identity.',409,'USER_EXISTS');
  const role=(await client.query("SELECT id FROM roles WHERE key='STUDENT' AND tenant_id IS NULL")).rows[0];
  if(!role)throw new AppError('Student role is not configured.',422,'STUDENT_ROLE_MISSING');
  await client.query("UPDATE user_invitations SET status='revoked' WHERE tenant_id=$1 AND status='pending' AND (student_id=$2 OR lower(email)=$3)",[req.tenantId,student.id,email]);
  const displayName=`${student.first_name} ${student.last_name||''}`.trim();
  const invitation=(await client.query("INSERT INTO user_invitations(tenant_id,student_id,email,display_name,role_id,token_hash,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+INTERVAL '7 days') RETURNING id,email,expires_at",[req.tenantId,student.id,email,displayName,role.id,createHash('sha256').update(token).digest('hex'),req.user.id])).rows[0];
  await writeAudit({tenantId:req.tenantId!,userId:req.user.id,action:'STUDENT_ACCOUNT_INVITED',module:'students',entityId:student.id,details:{invitationId:invitation.id,email},request:req},client);
  const school=(await client.query('SELECT name FROM tenants WHERE id=$1',[req.tenantId])).rows[0];
  await enqueueNotification({eventType:'OWNER_INVITATION',templateCode:'OWNER_INVITATION',tenantId:req.tenantId!,sourceType:'USER_INVITATION',sourceId:invitation.id,payload:{name:displayName,school_name:school.name,setup_url:`${config.appPublicUrl}/#/onboarding?token=${token}`},priority:'HIGH'},[{externalEmail:email}],client);
  return {...invitation,studentId:student.id,onboardingToken:token};
 });
}
export async function linkStudentAccount(req:Request){
 return transaction(async client=>{
  const student=await lockStudent(client,req);const email=req.body.email.trim().toLowerCase();
  const account=(await client.query("SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id AND m.tenant_id=$2 JOIN roles r ON r.id=m.role_id WHERE lower(u.email)=$1 AND u.status='ACTIVE' AND m.status='active' AND r.key='STUDENT' FOR UPDATE OF u,m",[email,req.tenantId])).rows[0];
  if(!account)throw new AppError('Existing account must be an active Student in this institute.',422,'STUDENT_MEMBERSHIP_REQUIRED');
  if((await client.query('SELECT id FROM students WHERE tenant_id=$1 AND user_id=$2',[req.tenantId,account.id])).rowCount)throw new AppError('Account is already linked to another student.',409,'STUDENT_ACCOUNT_IN_USE');
  await client.query('UPDATE students SET user_id=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',[account.id,student.id,req.tenantId]);
  await client.query("UPDATE user_invitations SET status='revoked' WHERE tenant_id=$1 AND student_id=$2 AND status='pending'",[req.tenantId,student.id]);
  await writeAudit({tenantId:req.tenantId!,userId:req.user.id,action:'STUDENT_ACCOUNT_LINKED',module:'students',entityId:student.id,details:{linkedUserId:account.id,email},request:req},client);
  return {studentId:student.id,userId:account.id,linkedExisting:true};
 });
}
