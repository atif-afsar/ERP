import type { PoolClient } from 'pg';
import { query } from '../db.js';

type Runner={query:(sql:string,params?:any[])=>Promise<any>};
export type NotificationRecipient={userId?:string;externalEmail?:string};
export type NotificationEvent={tenantId:string;eventType:string;templateCode:string;sourceType:string;sourceId:string;payload:Record<string,unknown>;priority?:'LOW'|'NORMAL'|'HIGH'|'URGENT'};

function runner(client?:PoolClient):Runner{return client||{query};}
export function escapeTemplateValue(value:unknown):string{return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
export function renderTemplate(template:string,payload:Record<string,unknown>):string {
  const missing=new Set<string>();
  const rendered=template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(_m,key)=>{if(!(key in payload)){missing.add(key);return `{{${key}}}`;}return escapeTemplateValue(payload[key]);});
  if(missing.size)throw new Error(`Missing template variables: ${[...missing].join(', ')}`);
  return rendered;
}
function plain(html:string){return html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}

export async function resolveParentRecipients(tenantId:string,studentId:string,client?:PoolClient):Promise<NotificationRecipient[]> {
  const result=await runner(client).query(`SELECT DISTINCT p.user_id FROM parent_students ps JOIN parents p ON p.id=ps.parent_id AND p.tenant_id=ps.tenant_id JOIN memberships m ON m.user_id=p.user_id AND m.tenant_id=p.tenant_id AND m.status='active' WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.receives_notifications=true AND p.user_id IS NOT NULL`,[tenantId,studentId]);
  return result.rows.map((row:any)=>({userId:row.user_id}));
}

export async function enqueueNotification(event:NotificationEvent,recipients:NotificationRecipient[],client?:PoolClient):Promise<{notificationId:string;jobs:number}> {
  const db=runner(client);
  if(!recipients.length)return{notificationId:'',jobs:0};
  const templates=(await db.query(`SELECT DISTINCT ON (channel) id,channel,name,category,subject_template,body_template FROM notification_templates WHERE code=$1 AND is_active=true AND (tenant_id=$2 OR tenant_id IS NULL) ORDER BY channel,(tenant_id IS NOT NULL) DESC`,[event.templateCode,event.tenantId])).rows;
  if(!templates.length)throw new Error(`Active notification template not found: ${event.templateCode}`);
  const display=templates.find((t:any)=>t.channel==='IN_APP')||templates[0];
  const title=display.subject_template?renderTemplate(display.subject_template,event.payload):display.name;
  const message=plain(renderTemplate(display.body_template,event.payload));
  let notification=(await db.query(`INSERT INTO notifications(tenant_id,user_id,type,title,message,data,event_type,template_code,source_type,source_id,priority,payload) VALUES($1,NULL,$2,$3,$4,$5,$2,$6,$7,$8,$9,$5) ON CONFLICT(tenant_id,event_type,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING RETURNING id`,[event.tenantId,event.eventType,title,message,JSON.stringify(event.payload),event.templateCode,event.sourceType,event.sourceId,event.priority||'NORMAL'])).rows[0];
  if(!notification)notification=(await db.query(`SELECT id FROM notifications WHERE tenant_id=$1 AND event_type=$2 AND source_type=$3 AND source_id=$4`,[event.tenantId,event.eventType,event.sourceType,event.sourceId])).rows[0];
  let jobs=0;
  for(const recipient of recipients){
    const userId=recipient.userId||null,externalEmail=recipient.externalEmail?.trim().toLowerCase()||null;
    if((userId?1:0)+(externalEmail?1:0)!==1)throw new Error('A notification recipient must contain exactly one identity.');
    if(userId){const allowed=await db.query(`SELECT 1 FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND status='active'`,[event.tenantId,userId]);if(!allowed.rowCount)throw new Error('Notification user is not an active tenant member.');}
    await db.query(`INSERT INTO notification_recipients(tenant_id,notification_id,user_id,external_email,recipient_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[event.tenantId,notification.id,userId,externalEmail,userId?'USER':'EXTERNAL_EMAIL']);
    const rec=(await db.query(`SELECT id FROM notification_recipients WHERE notification_id=$1 AND (($2::uuid IS NOT NULL AND user_id=$2) OR ($3::text IS NOT NULL AND lower(external_email)=$3))`,[notification.id,userId,externalEmail])).rows[0];
    for(const template of templates){
      if(template.channel==='IN_APP'&&!userId)continue;
      let skipped=false;
      if(userId&&template.category==='OPTIONAL'){const pref=await db.query(`SELECT is_enabled FROM notification_preferences WHERE tenant_id=$1 AND user_id=$2 AND event_type=$3 AND channel=$4`,[event.tenantId,userId,event.eventType,template.channel]);skipped=pref.rowCount&&!pref.rows[0].is_enabled;}
      const inserted=await db.query(`INSERT INTO notification_jobs(tenant_id,notification_id,recipient_id,channel,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(recipient_id,channel) DO NOTHING RETURNING id`,[event.tenantId,notification.id,rec.id,template.channel,skipped?'SKIPPED':'QUEUED']);
      jobs+=inserted.rowCount||0;
    }
  }
  return{notificationId:notification.id,jobs};
}

export async function cancelQueuedNotification(tenantId:string,eventType:string,sourceType:string,sourceId:string,client?:PoolClient){
  return runner(client).query(`UPDATE notification_jobs j SET status='CANCELLED',updated_at=NOW(),last_error='Business event was corrected before delivery' FROM notifications n WHERE j.notification_id=n.id AND n.tenant_id=$1 AND n.event_type=$2 AND n.source_type=$3 AND n.source_id=$4 AND j.status='QUEUED'`,[tenantId,eventType,sourceType,sourceId]);
}

export const NotificationService={dispatch:(event:any,recipients:NotificationRecipient[],client?:PoolClient)=>enqueueNotification({...event,eventType:event.eventType||event.templateCode},recipients,client)};
