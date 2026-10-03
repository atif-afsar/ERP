import {randomUUID} from 'node:crypto';
process.env.NODE_ENV='test';
const {pool}=await import('../src/db.ts');
const {default:app}=await import('../src/server.ts');
const {createToken}=await import('../src/routes/auth.ts');
export {pool};
export async function fixture(module){
 const tenant=randomUUID(),otherTenant=randomUUID();
 await pool.query(`INSERT INTO tenants(id,name,slug,tenant_type,status) VALUES($1,'Operations integration fixture',$2,'school','active'),($3,'Other operations fixture',$4,'school','active')`,[tenant,`ops-${tenant}`,otherTenant,`ops-${otherTenant}`]);
 async function account(role,scope=tenant){const id=randomUUID(),email=`${id}@example.test`;await pool.query(`INSERT INTO users(id,email,password_hash,status) VALUES($1,$2,'fixture','ACTIVE')`,[id,email]);await pool.query(`INSERT INTO profiles(id,display_name,status) VALUES($1,'Operations fixture','active')`,[id]);const r=(await pool.query(`SELECT id FROM roles WHERE key=$1 AND tenant_id IS NULL`,[role])).rows[0];await pool.query(`INSERT INTO memberships(tenant_id,user_id,role_id,status) VALUES($1,$2,$3,'active')`,[scope,id,r.id]);const version=(await pool.query('SELECT auth_version FROM users WHERE id=$1',[id])).rows[0].auth_version;return{token:createToken({id,email,role,tenantId:scope,version}),id};}
 const admin=await account('TENANT_ADMIN'),teacher=await account('TEACHER'),foreignAdmin=await account('TENANT_ADMIN',otherTenant);
 async function staff(scope=tenant){return(await pool.query(`INSERT INTO staff(tenant_id,employee_id,name,designation,department) VALUES($1,$2,'Driver/library fixture','Staff','Operations') RETURNING id`,[scope,randomUUID()])).rows[0].id;}
 async function student(scope=tenant){return(await pool.query(`INSERT INTO students(tenant_id,admission_no,first_name,last_name,gender,dob,status) VALUES($1,$2,'Student','Fixture','MALE','2014-01-01','ACTIVE') RETURNING id`,[scope,randomUUID()])).rows[0].id;}
 async function enrollment(scope=tenant,studentId){const pupil=studentId||await student(scope);const year=(await pool.query(`INSERT INTO academic_years(tenant_id,name,start_date,end_date) VALUES($1,$2,'2026-04-01','2027-03-31') RETURNING id`,[scope,`Year-${randomUUID()}`])).rows[0].id;const cls=(await pool.query(`INSERT INTO classes(tenant_id,name,academic_year_id) VALUES($1,$2,$3) RETURNING id`,[scope,`Class-${randomUUID()}`,year])).rows[0].id;const sec=(await pool.query(`INSERT INTO sections(tenant_id,class_id,name) VALUES($1,$2,'A') RETURNING id`,[scope,cls])).rows[0].id;return(await pool.query(`INSERT INTO enrollments(tenant_id,student_id,academic_year_id,class_id,section_id,status) VALUES($1,$2,$3,$4,$5,'enrolled') RETURNING id`,[scope,pupil,year,cls,sec])).rows[0].id;}
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 async function request(user,path='',method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/${module}${path}`,{method,headers:{authorization:`Bearer ${user.token}`,'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return{status:r.status,...await r.json()};}
 async function close(){await pool.query(`UPDATE notification_jobs SET status='SKIPPED' WHERE tenant_id=ANY($1::uuid[]) AND status='QUEUED'`,[[tenant,otherTenant]]);await pool.query(`UPDATE tenants SET status='inactive' WHERE id=ANY($1::uuid[])`,[[tenant,otherTenant]]);await new Promise(r=>server.close(r));await pool.end();}
 return{tenant,otherTenant,admin,teacher,foreignAdmin,staff,student,enrollment,request,close};
}
