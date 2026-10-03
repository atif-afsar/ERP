import { hostname } from 'node:os';
import { transaction,query } from '../db.js';
import { createEmailProvider,type EmailProvider } from './emailProvider.js';
import { renderTemplate } from './notificationService.js';

const RETRY_MINUTES=[1,5,30,120];
export function retryDelayMinutes(attempt:number){return RETRY_MINUTES[Math.min(Math.max(attempt-1,0),RETRY_MINUTES.length-1)];}

async function claimJobs(workerId:string,limit:number){
  return transaction(async client=>{
    await client.query(`UPDATE notification_jobs SET status='QUEUED',locked_at=NULL,locked_by=NULL,updated_at=NOW(),last_error='Recovered stale worker claim' WHERE status='PROCESSING' AND locked_at<NOW()-INTERVAL '10 minutes'`);
    const selected=await client.query(`SELECT id FROM notification_jobs WHERE status='QUEUED' AND next_attempt_at<=NOW() ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`,[limit]);
    if(!selected.rowCount)return[];
    return (await client.query(`UPDATE notification_jobs SET status='PROCESSING',locked_at=NOW(),locked_by=$1,updated_at=NOW() WHERE id=ANY($2::uuid[]) RETURNING id`,[workerId,selected.rows.map((x:any)=>x.id)])).rows.map((x:any)=>x.id);
  });
}

async function loadJob(id:string){return(await query(`SELECT j.*,n.event_type,n.template_code,n.payload,r.user_id,r.external_email,u.email user_email,t.category,t.subject_template,t.body_template FROM notification_jobs j JOIN notifications n ON n.id=j.notification_id JOIN notification_recipients r ON r.id=j.recipient_id LEFT JOIN users u ON u.id=r.user_id JOIN LATERAL(SELECT subject_template,body_template,category FROM notification_templates WHERE code=n.template_code AND channel=j.channel AND is_active=true AND (tenant_id=j.tenant_id OR tenant_id IS NULL) ORDER BY (tenant_id IS NOT NULL) DESC LIMIT 1)t ON true WHERE j.id=$1 AND j.status='PROCESSING'`,[id])).rows[0];}

async function finish(job:any,status:'SENT'|'FAILED',provider:string,messageId:string|null,error:string|null,permanent=false){
  const attempt=Number(job.attempts)+1,exhausted=permanent||attempt>=Number(job.max_attempts),finalStatus=status==='SENT'?'SENT':exhausted?'FAILED':'QUEUED',delay=retryDelayMinutes(attempt);
  await transaction(async client=>{
    await client.query(`INSERT INTO notification_deliveries(tenant_id,notification_id,recipient,channel,status,sent_at,recipient_id,job_id,provider,attempt_count,provider_message_id,last_error,failed_at,next_retry_at) VALUES($1,$2,$3,$4,$5::varchar,$6,$7,$8,$9,$10,$11,$12,$13,CASE WHEN $5::varchar='FAILED' THEN NOW()+($14||' minutes')::interval ELSE NULL END)`,[job.tenant_id,job.notification_id,job.external_email||job.user_id,job.channel,status,status==='SENT'?new Date():null,job.recipient_id,job.id,provider,attempt,messageId,error,status==='FAILED'?new Date():null,String(delay)]);
    await client.query(`UPDATE notification_jobs SET status=$1::varchar,attempts=$2,last_error=$3,sent_at=CASE WHEN $1::varchar='SENT' THEN NOW() ELSE sent_at END,next_attempt_at=CASE WHEN $1::varchar='QUEUED' THEN NOW()+($4||' minutes')::interval ELSE next_attempt_at END,locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=$5 AND status='PROCESSING'`,[finalStatus,attempt,error,String(delay),job.id]);
    await client.query(`UPDATE notification_recipients SET status=CASE WHEN $1::varchar='SENT' THEN 'DELIVERED' WHEN $1::varchar='FAILED' THEN 'FAILED' ELSE status END WHERE id=$2`,[finalStatus,job.recipient_id]);
  });
}

export async function processNotificationJobs(options:{provider?:EmailProvider;workerId?:string;batchSize?:number}={}){
  const provider=options.provider||createEmailProvider(),workerId=options.workerId||`${hostname()}:${process.pid}`,ids=await claimJobs(workerId,options.batchSize||20);let processed=0;
  for(const id of ids){const job=await loadJob(id);if(!job)continue;try{if(job.channel==='IN_APP')await finish(job,'SENT','IN_APP',`in-app-${job.id}`,null);else{const to=job.external_email||job.user_email;if(!to){const e:any=new Error('Recipient has no email address');e.transient=false;throw e;}const subject=renderTemplate(job.subject_template,job.payload),html=renderTemplate(job.body_template,job.payload),text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),result=await provider.send({to,subject,html,text,idempotencyKey:job.id});await finish(job,'SENT',result.provider,result.messageId,null);}processed++;console.log(JSON.stringify({level:'info',event:'notification_job_sent',jobId:job.id,channel:job.channel,workerId}));}catch(error:any){await finish(job,'FAILED',job.channel==='EMAIL'?'EMAIL':'IN_APP',null,String(error?.message||error).slice(0,2000),error?.transient===false);console.error(JSON.stringify({level:'error',event:'notification_job_failed',jobId:job.id,channel:job.channel,workerId,error:String(error?.message||error).slice(0,300)}));}}
  return{claimed:ids.length,processed};
}
