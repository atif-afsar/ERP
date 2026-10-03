import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { pool } from './db.js';
import { processNotificationJobs } from './services/notificationWorker.js';

let timer:NodeJS.Timeout|undefined,running=false,stopping=false;
async function tick(){if(running||stopping)return;running=true;try{await processNotificationJobs();}catch(error:any){console.error(JSON.stringify({level:'error',event:'notification_worker_error',error:String(error?.message||error)}));}finally{running=false;}}
export function startNotificationWorker(){console.log(JSON.stringify({level:'info',event:'notification_worker_started',pollMs:config.notificationPollMs}));void tick();timer=setInterval(()=>void tick(),config.notificationPollMs);}
export async function stopNotificationWorker(signal='shutdown'){stopping=true;if(timer)clearInterval(timer);while(running)await new Promise(resolve=>setTimeout(resolve,25));await pool.end();console.log(JSON.stringify({level:'info',event:'notification_worker_stopped',signal}));}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){startNotificationWorker();process.once('SIGTERM',()=>void stopNotificationWorker('SIGTERM'));process.once('SIGINT',()=>void stopNotificationWorker('SIGINT'));}
