import { config } from '../config.js';

export interface EmailMessage { to:string; subject:string; html:string; text:string; idempotencyKey?:string }
export interface EmailResult { messageId:string; provider:string }
export interface EmailProvider { send(message:EmailMessage):Promise<EmailResult> }

export class LogEmailProvider implements EmailProvider {
  async send(message:EmailMessage):Promise<EmailResult> {
    const messageId=`log-${crypto.randomUUID()}`;
    console.log(JSON.stringify({level:'info',event:'email_simulated',provider:'LOG',messageId,toDomain:message.to.split('@')[1]||'invalid',subjectLength:message.subject.length,bodyLength:message.html.length}));
    return {messageId,provider:'LOG'};
  }
}

export class ResendEmailProvider implements EmailProvider {
  async send(message:EmailMessage):Promise<EmailResult> {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${config.resendApiKey}`,'Content-Type':'application/json',...(message.idempotencyKey?{'Idempotency-Key':message.idempotencyKey}:{})},
      body:JSON.stringify({from:`${config.emailFromName} <${config.emailFromAddress}>`,to:[message.to],subject:message.subject,html:message.html,text:message.text}),
    });
    const body:any=await response.json().catch(()=>({}));
    if(!response.ok){const error:any=new Error(body?.message||`Email provider returned ${response.status}`);error.transient=response.status===429||response.status>=500;throw error;}
    return {messageId:String(body.id),provider:'RESEND'};
  }
}

export function createEmailProvider():EmailProvider {
  return config.emailDeliveryMode==='LOG'?new LogEmailProvider():new ResendEmailProvider();
}
