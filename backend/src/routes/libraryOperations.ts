import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { id,text,state,validateId,logOperation,reference,operationError } from './operationsSupport.js';
const router=Router();router.use(tenantContext(true));
router.get('/',requirePermission('library.view'),asyncHandler(async(req,res)=>{
  const t=req.tenantId;
  const [titles,categories,copies,loans,students,staff]=await Promise.all([
    query(`SELECT b.id,b.title,b.author,b.isbn,b.lifecycle_status status,c.name category,COUNT(cp.id)::int total_copies,COUNT(cp.id) FILTER(WHERE b.lifecycle_status='ACTIVE' AND cp.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM library_loans l WHERE l.copy_id=cp.id AND l.status='ISSUED'))::int available_copies FROM library_books b LEFT JOIN library_categories c ON c.id=b.category_id AND c.tenant_id=b.tenant_id LEFT JOIN book_copies cp ON cp.book_id=b.id AND cp.tenant_id=b.tenant_id WHERE b.tenant_id=$1 GROUP BY b.id,c.name ORDER BY b.title`,[t]),
    query('SELECT * FROM library_categories WHERE tenant_id=$1 ORDER BY name',[t]),
    query(`SELECT cp.*,b.title,CASE WHEN b.lifecycle_status<>'ACTIVE' THEN b.lifecycle_status WHEN cp.status='ACTIVE' AND EXISTS(SELECT 1 FROM library_loans l WHERE l.copy_id=cp.id AND l.status='ISSUED') THEN 'ISSUED' ELSE cp.status END availability FROM book_copies cp JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=cp.tenant_id WHERE cp.tenant_id=$1 ORDER BY cp.accession_number`,[t]),
    query(`SELECT l.*,b.title,cp.accession_number,COALESCE(s.first_name||' '||COALESCE(s.last_name,''),st.name) borrower,CASE WHEN l.status='ISSUED' AND l.due_on<CURRENT_DATE THEN 'OVERDUE' ELSE l.status END display_status FROM library_loans l JOIN book_copies cp ON cp.id=l.copy_id AND cp.tenant_id=l.tenant_id JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=l.tenant_id LEFT JOIN students s ON s.id=l.student_id AND s.tenant_id=l.tenant_id LEFT JOIN staff st ON st.id=l.staff_id AND st.tenant_id=l.tenant_id WHERE l.tenant_id=$1 ORDER BY l.issued_on DESC`,[t]),
    query(`SELECT id,first_name||' '||COALESCE(last_name,'') name FROM students WHERE tenant_id=$1 ORDER BY first_name`,[t]),query('SELECT id,name FROM staff WHERE tenant_id=$1 ORDER BY name',[t])
  ]);res.json({data:{titles:titles.rows,categories:categories.rows,copies:copies.rows,loans:loans.rows,students:students.rows,staff:staff.rows}});
}));
router.post('/categories',requirePermission('library.manage'),validateBody(z.object({name:z.string().trim().min(1).max(100)})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{const r=(await c.query('INSERT INTO library_categories(tenant_id,name) VALUES($1,$2) RETURNING *',[req.tenantId,req.body.name])).rows[0];await logOperation(req,c,'library','LIBRARY_CATEGORY_CREATED',r.id);return r;});res.status(201).json({data});
}));
router.post('/titles',requirePermission('library.manage'),validateBody(z.object({title:text,author:text,isbn:z.string().max(50).optional(),categoryId:id})),asyncHandler(async(req,res)=>{
 const b=req.body;const data=await transaction(async c=>{
 if(!(await c.query('SELECT id FROM library_categories WHERE id=$1 AND tenant_id=$2',[b.categoryId,req.tenantId])).rowCount)throw new AppError('Category not found.',422,'INVALID_REFERENCE');
 const r=(await c.query(`INSERT INTO library_books(tenant_id,title,author,isbn,category_id,total_copies,available_copies) VALUES($1,$2,$3,$4,$5,0,0) RETURNING *`,[req.tenantId,b.title,b.author,b.isbn||null,b.categoryId])).rows[0];await logOperation(req,c,'library','LIBRARY_TITLE_CREATED',r.id);return r;});res.status(201).json({data});
}));
router.patch('/titles/:id',validateId,requirePermission('library.manage'),validateBody(z.object({status:state})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{const r=(await c.query('UPDATE library_books SET lifecycle_status=$3 WHERE id=$1 AND tenant_id=$2 RETURNING *',[req.params.id,req.tenantId,req.body.status])).rows[0];if(!r)throw new AppError('Title not found.',404,'NOT_FOUND');await logOperation(req,c,'library','LIBRARY_TITLE_UPDATED',r.id,req.body);return r;});res.json({data});
}));
router.post('/copies',requirePermission('library.manage'),validateBody(z.object({bookId:id,accessionNumber:z.string().trim().min(1).max(100)})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{if(!(await c.query(`SELECT id FROM library_books WHERE id=$1 AND tenant_id=$2 AND lifecycle_status='ACTIVE'`,[req.body.bookId,req.tenantId])).rowCount)throw new AppError('Active title not found.',422,'INVALID_REFERENCE');const r=(await c.query('INSERT INTO book_copies(tenant_id,book_id,accession_number) VALUES($1,$2,$3) RETURNING *',[req.tenantId,req.body.bookId,req.body.accessionNumber])).rows[0];await logOperation(req,c,'library','LIBRARY_COPY_CREATED',r.id);return r;});res.status(201).json({data});
}));
router.post('/loans',requirePermission('library.issue'),validateBody(z.object({copyId:id,borrowerType:z.enum(['STUDENT','STAFF']),borrowerId:id,issuedOn:z.string().date(),dueOn:z.string().date()}).refine(b=>b.dueOn>=b.issuedOn,'Due date precedes issue date.')),asyncHandler(async(req,res)=>{
 const b=req.body;const data=await transaction(async c=>{
 const cp=(await c.query(`SELECT cp.* FROM book_copies cp JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=cp.tenant_id WHERE cp.id=$1 AND cp.tenant_id=$2 AND b.lifecycle_status='ACTIVE' FOR UPDATE OF cp`,[b.copyId,req.tenantId])).rows[0];
 if(!cp)throw new AppError('Copy not found.',422,'INVALID_REFERENCE');if(cp.status!=='ACTIVE'||(await c.query(`SELECT 1 FROM library_loans WHERE copy_id=$1 AND status='ISSUED'`,[cp.id])).rowCount)throw new AppError('Copy unavailable.',409,'COPY_UNAVAILABLE');
 await reference(c,b.borrowerType==='STUDENT'?'students':'staff',req.tenantId!,b.borrowerId);
 const r=(await c.query('INSERT INTO library_loans(tenant_id,copy_id,student_id,staff_id,issued_on,due_on) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[req.tenantId,cp.id,b.borrowerType==='STUDENT'?b.borrowerId:null,b.borrowerType==='STAFF'?b.borrowerId:null,b.issuedOn,b.dueOn])).rows[0];await logOperation(req,c,'library','LIBRARY_COPY_ISSUED',r.id);return r;
 });res.status(201).json({data});
}));
router.post('/loans/:id/return',validateId,requirePermission('library.issue'),validateBody(z.object({returnedOn:z.string().date()})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{
 const target=(await c.query('SELECT copy_id FROM library_loans WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId])).rows[0];if(!target)throw new AppError('Loan not found.',404,'NOT_FOUND');
 await c.query('SELECT id FROM book_copies WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[target.copy_id,req.tenantId]);
 const r=(await c.query(`UPDATE library_loans SET status='RETURNED',returned_on=$3 WHERE id=$1 AND tenant_id=$2 AND status='ISSUED' AND issued_on<=$3 RETURNING *`,[req.params.id,req.tenantId,req.body.returnedOn])).rows[0];if(!r)throw new AppError('Active loan or valid return date required.',409,'INVALID_LOAN_STATE');await logOperation(req,c,'library','LIBRARY_COPY_RETURNED',r.id);return r;
 });res.json({data});
}));
router.post('/loans/:id/lost',validateId,requirePermission('library.issue'),validateBody(z.object({reason:z.string().trim().min(3).max(2000)})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{
 const target=(await c.query('SELECT copy_id FROM library_loans WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId])).rows[0];if(!target)throw new AppError('Loan not found.',404,'NOT_FOUND');
 await c.query('SELECT id FROM book_copies WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[target.copy_id,req.tenantId]);
 const r=(await c.query(`UPDATE library_loans SET status='LOST' WHERE id=$1 AND tenant_id=$2 AND status='ISSUED' RETURNING *`,[req.params.id,req.tenantId])).rows[0];if(!r)throw new AppError('Active loan required.',409,'INVALID_LOAN_STATE');
 await c.query(`UPDATE book_copies SET status='LOST' WHERE id=$1 AND tenant_id=$2`,[target.copy_id,req.tenantId]);await logOperation(req,c,'library','LIBRARY_COPY_LOST',r.id,{reason:req.body.reason});return r;
 });res.json({data});
}));
router.use((_req,_res,next)=>next(new AppError('Library endpoint not found.',404,'NOT_FOUND')));
router.use(operationError);export default router;
