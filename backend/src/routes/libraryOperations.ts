import type { PoolClient } from 'pg';
import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { id,text,state,validateId,logOperation,reference,operationError } from './operationsSupport.js';
import { validateAndNormalizeIsbn } from '../services/isbnService.js';

async function validateLibraryBorrower(c: PoolClient, tenantId: string, borrowerType: 'STUDENT' | 'STAFF', borrowerId: string, forUpdate = false) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  if (borrowerType === 'STAFF') {
    const res = await c.query(`SELECT id, status FROM staff WHERE tenant_id = $1 AND id = $2${lock}`, [tenantId, borrowerId]);
    if (!res.rowCount) throw new AppError('Referenced staff member not found in this institution.', 422, 'INVALID_REFERENCE');
    if (res.rows[0].status !== 'ACTIVE') throw new AppError('Only active staff members can borrow library materials.', 422, 'INVALID_REFERENCE');
  } else if (borrowerType === 'STUDENT') {
    const res = await c.query(`SELECT id, status FROM students WHERE tenant_id = $1 AND id = $2${lock}`, [tenantId, borrowerId]);
    if (!res.rowCount) throw new AppError('Referenced student not found in this institution.', 422, 'INVALID_REFERENCE');
    if (res.rows[0].status !== 'ACTIVE') throw new AppError('Only active students can borrow library materials.', 422, 'INVALID_REFERENCE');
  } else {
    throw new AppError('Invalid borrower type.', 422, 'INVALID_REFERENCE');
  }
}

async function getOrInitLibrarySettings(executor: { query: (sql: string, params: any[]) => Promise<any> }, tenantId: string, forUpdate = false) {
  const sql = forUpdate
    ? 'SELECT id, tenant_id, renewal_days, maximum_renewals, updated_at FROM library_settings WHERE tenant_id = $1 FOR UPDATE'
    : 'SELECT id, tenant_id, renewal_days, maximum_renewals, updated_at FROM library_settings WHERE tenant_id = $1';
  let res = await executor.query(sql, [tenantId]);
  if (!res.rowCount) {
    res = await executor.query(
      'INSERT INTO library_settings (tenant_id, renewal_days, maximum_renewals) VALUES ($1, 14, 2) ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id RETURNING id, tenant_id, renewal_days, maximum_renewals, updated_at',
      [tenantId]
    );
  }
  return res.rows[0];
}

const policyPatchSchema = z.object({
  renewalDays: z.number().int().min(1).max(90).optional(),
  maximumRenewals: z.number().int().min(0).max(10).optional(),
  renewal_days: z.number().int().min(1).max(90).optional(),
  maximum_renewals: z.number().int().min(0).max(10).optional(),
}).refine(
  data => (
    data.renewalDays !== undefined ||
    data.renewal_days !== undefined ||
    data.maximumRenewals !== undefined ||
    data.maximum_renewals !== undefined
  ),
  { message: 'At least one policy setting must be provided.' }
);

const router=Router();router.use(tenantContext(true));

router.get('/',requirePermission('library.view'),asyncHandler(async(req,res)=>{
  const t=req.tenantId;
  const [titles,categories,copies,loans,students,staff,policyRes,renewals,conditionLogs]=await Promise.all([
    query(`SELECT b.id,b.title,b.author,COALESCE(b.isbn_normalized,b.isbn) isbn,b.isbn_normalized,b.lifecycle_status status,c.name category,COUNT(cp.id)::int total_copies,COUNT(cp.id) FILTER(WHERE b.lifecycle_status='ACTIVE' AND cp.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM library_loans l WHERE l.copy_id=cp.id AND l.status='ISSUED'))::int available_copies FROM library_books b LEFT JOIN library_categories c ON c.id=b.category_id AND c.tenant_id=b.tenant_id LEFT JOIN book_copies cp ON cp.book_id=b.id AND cp.tenant_id=b.tenant_id WHERE b.tenant_id=$1 GROUP BY b.id,c.name ORDER BY b.title`,[t]),
    query('SELECT * FROM library_categories WHERE tenant_id=$1 ORDER BY name',[t]),
    query(`SELECT cp.*,b.title,b.author,CASE WHEN EXISTS(SELECT 1 FROM library_loans l WHERE l.copy_id=cp.id AND l.status='ISSUED') THEN 'ISSUED' WHEN b.lifecycle_status<>'ACTIVE' THEN b.lifecycle_status ELSE cp.status END availability FROM book_copies cp JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=cp.tenant_id WHERE cp.tenant_id=$1 ORDER BY cp.accession_number`,[t]),
    query(`SELECT l.*,l.due_on::text due_on,l.issued_on::text issued_on,b.title,b.author,cp.accession_number,TRIM(COALESCE(NULLIF(TRIM(s.first_name||' '||COALESCE(s.last_name,'')),''),st.name,'Unknown Borrower')) borrower,CASE WHEN l.student_id IS NOT NULL THEN 'Student' ELSE 'Staff' END borrower_type,CASE WHEN l.status='ISSUED' AND l.due_on<CURRENT_DATE THEN 'OVERDUE' ELSE l.status END display_status,COALESCE(s.status,st.status) borrower_status,b.lifecycle_status title_status FROM library_loans l JOIN book_copies cp ON cp.id=l.copy_id AND cp.tenant_id=l.tenant_id JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=l.tenant_id LEFT JOIN students s ON s.id=l.student_id AND s.tenant_id=l.tenant_id LEFT JOIN staff st ON st.id=l.staff_id AND st.tenant_id=l.tenant_id WHERE l.tenant_id=$1 ORDER BY l.issued_on DESC`,[t]),
    query(`SELECT id,first_name||' '||COALESCE(last_name,'') name FROM students WHERE tenant_id=$1 AND status='ACTIVE' ORDER BY first_name`,[t]),
    query(`SELECT id,name FROM staff WHERE tenant_id=$1 AND status='ACTIVE' ORDER BY name`,[t]),
    query('SELECT renewal_days, maximum_renewals, updated_at FROM library_settings WHERE tenant_id=$1',[t]),
    query(`SELECT r.id, r.loan_id, r.previous_due_on::text AS previous_due_on, r.new_due_on::text AS new_due_on,
                  r.renewal_number, r.renewed_at, b.title, cp.accession_number,
                  TRIM(COALESCE(NULLIF(TRIM(s.first_name||' '||COALESCE(s.last_name,'')),''),st.name,'Unknown Borrower')) borrower,
                  CASE WHEN l.student_id IS NOT NULL THEN 'Student' ELSE 'Staff' END borrower_type
           FROM library_loan_renewals r
           JOIN library_loans l ON l.id=r.loan_id AND l.tenant_id=r.tenant_id
           JOIN book_copies cp ON cp.id=l.copy_id AND cp.tenant_id=l.tenant_id
           JOIN library_books b ON b.id=cp.book_id AND b.tenant_id=l.tenant_id
           LEFT JOIN students s ON s.id=l.student_id AND s.tenant_id=l.tenant_id
           LEFT JOIN staff st ON st.id=l.staff_id AND st.tenant_id=l.tenant_id
           WHERE r.tenant_id=$1
           ORDER BY r.renewed_at DESC LIMIT 100`,[t]),
    query(`SELECT cl.id, cl.copy_id, cl.loan_id, cl.previous_status, cl.new_status, cl.previous_condition, cl.new_condition,
                  cl.action, cl.reason, cl.repair_cost, cl.performed_by, cl.created_at,
                  cp.accession_number, b.title,
                  COALESCE(NULLIF(TRIM(p.display_name), ''), 'Authorized user') AS performed_by_name
           FROM library_copy_condition_logs cl
           JOIN book_copies cp ON cp.id = cl.copy_id AND cp.tenant_id = cl.tenant_id
           JOIN library_books b ON b.id = cp.book_id AND b.tenant_id = cl.tenant_id
           LEFT JOIN users u ON u.id = cl.performed_by
           LEFT JOIN profiles p ON p.id = u.id
           WHERE cl.tenant_id = $1
           ORDER BY cl.created_at DESC
           LIMIT 100`, [t])
  ]);
  const defaultPolicy = { renewal_days: 14, maximum_renewals: 2, renewalDays: 14, maximumRenewals: 2 };
  const pol = policyRes.rows[0] ? { ...policyRes.rows[0], renewalDays: policyRes.rows[0].renewal_days, maximumRenewals: policyRes.rows[0].maximum_renewals } : defaultPolicy;
  res.json({data:{titles:titles.rows,categories:categories.rows,copies:copies.rows,loans:loans.rows,students:students.rows,staff:staff.rows,policy:pol,renewals:renewals.rows,conditionLogs:conditionLogs.rows}});
}));

router.get('/policy',requirePermission('library.view'),asyncHandler(async(req,res)=>{
  const setting = await getOrInitLibrarySettings({ query }, req.tenantId!);
  res.json({
    data: {
      renewalDays: setting.renewal_days,
      maximumRenewals: setting.maximum_renewals,
      renewal_days: setting.renewal_days,
      maximum_renewals: setting.maximum_renewals,
      updatedAt: setting.updated_at,
    }
  });
}));

router.patch('/policy',requirePermission('library.manage'),validateBody(policyPatchSchema),asyncHandler(async(req,res)=>{
  const b = req.body;
  const renewalDays = b.renewalDays !== undefined ? b.renewalDays : b.renewal_days;
  const maximumRenewals = b.maximumRenewals !== undefined ? b.maximumRenewals : b.maximum_renewals;

  const data = await transaction(async c => {
    const current = await getOrInitLibrarySettings(c, req.tenantId!, true);
    const newDays = renewalDays !== undefined ? renewalDays : current.renewal_days;
    const newMax = maximumRenewals !== undefined ? maximumRenewals : current.maximum_renewals;

    const r = (await c.query(
      `UPDATE library_settings
       SET renewal_days = $1, maximum_renewals = $2, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $3
       RETURNING id, renewal_days, maximum_renewals, updated_at`,
      [newDays, newMax, req.tenantId]
    )).rows[0];

    await logOperation(req, c, 'library', 'LIBRARY_POLICY_UPDATED', r.id, {
      previousRenewalDays: current.renewal_days,
      newRenewalDays: r.renewal_days,
      previousMaximumRenewals: current.maximum_renewals,
      newMaximumRenewals: r.maximum_renewals,
    });

    return {
      renewalDays: r.renewal_days,
      maximumRenewals: r.maximum_renewals,
      renewal_days: r.renewal_days,
      maximum_renewals: r.maximum_renewals,
      updatedAt: r.updated_at,
    };
  });

  res.json({ data });
}));

router.post('/categories',requirePermission('library.manage'),validateBody(z.object({name:z.string().trim().min(1).max(100)})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{const r=(await c.query('INSERT INTO library_categories(tenant_id,name) VALUES($1,$2) RETURNING *',[req.tenantId,req.body.name])).rows[0];await logOperation(req,c,'library','LIBRARY_CATEGORY_CREATED',r.id);return r;});res.status(201).json({data});
}));

router.post('/titles',requirePermission('library.manage'),validateBody(z.object({title:text,author:text,isbn:z.unknown().optional(),categoryId:id})),asyncHandler(async(req,res)=>{
 const b=req.body;
 const isbnValidation=validateAndNormalizeIsbn(b.isbn);
 if(!isbnValidation.isValid){
  throw new AppError(isbnValidation.error||'A valid ISBN-10 or ISBN-13 is required.',422,'INVALID_ISBN');
 }
 const canonicalIsbn=isbnValidation.normalized;
 const data=await transaction(async c=>{
  if(!(await c.query('SELECT id FROM library_categories WHERE id=$1 AND tenant_id=$2',[b.categoryId,req.tenantId])).rowCount)throw new AppError('Category not found.',422,'INVALID_REFERENCE');
  if(canonicalIsbn){
   const existing=await c.query('SELECT id FROM library_books WHERE tenant_id=$1 AND isbn_normalized=$2 LIMIT 1',[req.tenantId,canonicalIsbn]);
   if(existing.rowCount)throw new AppError('This ISBN already belongs to another title in this institution.',409,'ISBN_EXISTS');
   const unresolved=await c.query('SELECT id FROM library_isbn_remediation WHERE tenant_id=$1 AND classification=$2 AND canonical_isbn=$3 LIMIT 1',[req.tenantId,'VALID_COLLISION',canonicalIsbn]);
   if(unresolved.rowCount)throw new AppError('This ISBN already belongs to another title in this institution.',409,'ISBN_EXISTS');
  }
  let r;
  try{
   r=(await c.query(`INSERT INTO library_books(tenant_id,title,author,isbn,isbn_normalized,category_id,total_copies,available_copies) VALUES($1,$2,$3,$4,$5,$6,0,0) RETURNING *`,[req.tenantId,b.title,b.author,canonicalIsbn,canonicalIsbn,b.categoryId])).rows[0];
  }catch(err:any){
   if(err.code==='23505'&&err.constraint==='library_books_tenant_isbn_normalized_uidx'){
    throw new AppError('This ISBN already belongs to another title in this institution.',409,'ISBN_EXISTS');
   }
   throw err;
  }
  await logOperation(req,c,'library','LIBRARY_TITLE_CREATED',r.id);
  return r;
 });
 res.status(201).json({data});
}));

router.patch('/titles/:id',validateId,requirePermission('library.manage'),validateBody(z.object({status:state})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{
  const title=(await c.query('SELECT id, lifecycle_status FROM library_books WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId])).rows[0];
  if(!title)throw new AppError('Title not found.',404,'NOT_FOUND');
  if(req.body.status==='ARCHIVED'){
   const active=(await c.query(`SELECT 1 FROM library_loans l JOIN book_copies cp ON cp.id=l.copy_id AND cp.tenant_id=l.tenant_id WHERE cp.book_id=$1 AND cp.tenant_id=$2 AND l.status='ISSUED' LIMIT 1`,[req.params.id,req.tenantId])).rowCount;
   if(active)throw new AppError('Cannot archive title while active loans exist. All active loans must be resolved before archiving.',409,'ACTIVE_LOANS_EXIST');
  }
  const r=(await c.query('UPDATE library_books SET lifecycle_status=$3 WHERE id=$1 AND tenant_id=$2 RETURNING *',[req.params.id,req.tenantId,req.body.status])).rows[0];
  await logOperation(req,c,'library','LIBRARY_TITLE_UPDATED',r.id,req.body);return r;
 });res.json({data});
}));

router.post('/copies',requirePermission('library.manage'),validateBody(z.object({bookId:id,accessionNumber:z.string().trim().min(1).max(100),condition:z.enum(['EXCELLENT','GOOD','FAIR']).default('GOOD').optional()})),asyncHandler(async(req,res)=>{
 const data=await transaction(async c=>{
  if(!(await c.query(`SELECT id FROM library_books WHERE id=$1 AND tenant_id=$2 AND lifecycle_status='ACTIVE'`,[req.body.bookId,req.tenantId])).rowCount)throw new AppError('Active title not found.',422,'INVALID_REFERENCE');
  const cond = req.body.condition || 'GOOD';
  const r=(await c.query('INSERT INTO book_copies(tenant_id,book_id,accession_number,condition) VALUES($1,$2,$3,$4) RETURNING *',[req.tenantId,req.body.bookId,req.body.accessionNumber,cond])).rows[0];
  await c.query(
    `INSERT INTO library_copy_condition_logs (tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by)
     VALUES ($1, $2, 'NONE', 'ACTIVE', 'NONE', $3, 'ASSESSED', 'Initial copy accession', $4)`,
    [req.tenantId, r.id, cond, req.user?.id || null]
  );
  await logOperation(req,c,'library','LIBRARY_COPY_CREATED',r.id);
  return r;
 });
 res.status(201).json({data});
}));

router.post('/loans',requirePermission('library.issue'),validateBody(z.object({copyId:id,borrowerType:z.enum(['STUDENT','STAFF']),borrowerId:id,issuedOn:z.string().date(),dueOn:z.string().date()}).refine(b=>b.dueOn>=b.issuedOn,'Due date precedes issue date.')),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // 1. Lock the physical copy FIRST
    const copyRes = await c.query(
      `SELECT id, book_id, status FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [b.copyId, req.tenantId]
    );
    if (!copyRes.rowCount) {
      throw new AppError('Copy not found.', 422, 'INVALID_REFERENCE');
    }
    const cp = copyRes.rows[0];
    if (cp.status !== 'ACTIVE') {
      throw new AppError('Copy unavailable.', 409, 'COPY_UNAVAILABLE');
    }

    // 2. Under copy lock, verify no active ISSUED loan exists for this physical copy
    const activeLoan = await c.query(
      `SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED'`,
      [cp.id, req.tenantId]
    );
    if (activeLoan.rowCount) {
      throw new AppError('Copy unavailable.', 409, 'COPY_UNAVAILABLE');
    }

    // 3. Lock the parent title SECOND
    const bookRes = await c.query(
      `SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [cp.book_id, req.tenantId]
    );
    if (!bookRes.rowCount || bookRes.rows[0].lifecycle_status !== 'ACTIVE') {
      throw new AppError('Copy unavailable.', 409, 'COPY_UNAVAILABLE');
    }

    // 4. Validate and lock the borrower THIRD
    await validateLibraryBorrower(c, req.tenantId!, b.borrowerType, b.borrowerId, true);

    // 5. Insert the new loan under lock with active-loan unique index error translation
    let r;
    try {
      r = (await c.query(
        `INSERT INTO library_loans (tenant_id, copy_id, student_id, staff_id, issued_on, due_on, status, renewal_count)
         VALUES ($1, $2, $3, $4, $5, $6, 'ISSUED', 0)
         RETURNING *`,
        [req.tenantId, cp.id, b.borrowerType === 'STUDENT' ? b.borrowerId : null, b.borrowerType === 'STAFF' ? b.borrowerId : null, b.issuedOn, b.dueOn]
      )).rows[0];
    } catch (err: any) {
      if (err.code === '23505' && err.constraint === 'library_one_active_loan') {
        throw new AppError('Copy unavailable.', 409, 'COPY_UNAVAILABLE');
      }
      throw err;
    }

    await logOperation(req, c, 'library', 'LIBRARY_COPY_ISSUED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.post('/loans/:id/renew',validateId,requirePermission('library.issue'),asyncHandler(async(req,res)=>{
  const data = await transaction(async c => {
    // 1. Lock loan first
    const loanRes = await c.query(
      `SELECT id, copy_id, student_id, staff_id, status, due_on::text AS due_on,
              renewal_count, (due_on < CURRENT_DATE) AS is_overdue
       FROM library_loans
       WHERE id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [req.params.id, req.tenantId]
    );
    if (!loanRes.rowCount) {
      throw new AppError('Loan not found.', 404, 'NOT_FOUND');
    }
    const loan = loanRes.rows[0];

    // Status checks
    if (loan.status !== 'ISSUED') {
      throw new AppError('Returned or lost loans cannot be renewed.', 409, 'LOAN_NOT_RENEWABLE');
    }
    if (loan.is_overdue) {
      throw new AppError('Overdue loans cannot be renewed.', 409, 'LOAN_OVERDUE');
    }

    // 2. Lock parent copy and title
    const copyRes = await c.query(
      `SELECT id, book_id, status FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [loan.copy_id, req.tenantId]
    );
    if (!copyRes.rowCount || copyRes.rows[0].status !== 'ACTIVE') {
      throw new AppError('Physical copy is not in an active loan state.', 409, 'LOAN_NOT_RENEWABLE');
    }
    const copy = copyRes.rows[0];

    const bookRes = await c.query(
      `SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [copy.book_id, req.tenantId]
    );
    if (!bookRes.rowCount || bookRes.rows[0].lifecycle_status !== 'ACTIVE') {
      throw new AppError('Title is not active and cannot be renewed.', 409, 'LOAN_NOT_RENEWABLE');
    }

    // 3. Lock borrower
    if (loan.student_id) {
      const sRes = await c.query(
        `SELECT id, status FROM students WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [loan.student_id, req.tenantId]
      );
      if (!sRes.rowCount || sRes.rows[0].status !== 'ACTIVE') {
        throw new AppError('Student borrower is no longer active or eligible for loan renewal.', 409, 'BORROWER_INELIGIBLE');
      }
    } else if (loan.staff_id) {
      const stRes = await c.query(
        `SELECT id, status FROM staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [loan.staff_id, req.tenantId]
      );
      if (!stRes.rowCount || stRes.rows[0].status !== 'ACTIVE') {
        throw new AppError('Staff borrower is no longer active or eligible for loan renewal.', 409, 'BORROWER_INELIGIBLE');
      }
    } else {
      throw new AppError('Borrower reference is missing.', 409, 'BORROWER_INELIGIBLE');
    }

    // 4. Lock policy
    const policy = await getOrInitLibrarySettings(c, req.tenantId!, true);
    if (policy.maximum_renewals === 0) {
      throw new AppError('Loan renewal is disabled by library policy.', 409, 'RENEWAL_DISABLED');
    }
    if (loan.renewal_count >= policy.maximum_renewals) {
      throw new AppError('Maximum renewal limit reached for this loan.', 409, 'RENEWAL_LIMIT_REACHED');
    }

    // 5. Calculate new calendar due date strictly in PostgreSQL
    const dateCalc = await c.query(
      `SELECT ($1::date + $2::int)::date::text AS new_due_on`,
      [loan.due_on, policy.renewal_days]
    );
    const newDueOn: string = dateCalc.rows[0].new_due_on;
    const nextRenewalNumber = loan.renewal_count + 1;
    const remainingRenewals = Math.max(0, policy.maximum_renewals - nextRenewalNumber);

    // 6. Update loan
    const updatedLoan = (await c.query(
      `UPDATE library_loans
       SET due_on = $3::date,
           renewal_count = renewal_count + 1,
           last_renewed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, due_on::text AS due_on, renewal_count, last_renewed_at`,
      [loan.id, req.tenantId, newDueOn]
    )).rows[0];

    // 7. Insert durable renewal history
    const renewalHistory = (await c.query(
      `INSERT INTO library_loan_renewals (
         tenant_id, loan_id, previous_due_on, new_due_on, renewal_number, renewed_by, renewed_at
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, CURRENT_TIMESTAMP)
       RETURNING id, renewed_at`,
      [req.tenantId, loan.id, loan.due_on, newDueOn, nextRenewalNumber, req.user?.id || null]
    )).rows[0];

    // 8. Audit event within the same transaction
    await logOperation(req, c, 'library', 'LIBRARY_LOAN_RENEWED', loan.id, {
      previousDueDate: loan.due_on,
      newDueDate: newDueOn,
      renewalNumber: nextRenewalNumber,
      policyDays: policy.renewal_days,
    });

    return {
      loanId: loan.id,
      loan_id: loan.id,
      previousDueDate: loan.due_on,
      previous_due_on: loan.due_on,
      newDueDate: newDueOn,
      new_due_on: newDueOn,
      renewalCount: updatedLoan.renewal_count,
      renewal_count: updatedLoan.renewal_count,
      maximumRenewals: policy.maximum_renewals,
      maximum_renewals: policy.maximum_renewals,
      remainingRenewals,
      remaining_renewals: remainingRenewals,
      renewedAt: renewalHistory.renewed_at,
      renewed_at: renewalHistory.renewed_at,
    };
  });

  res.json({ data });
}));

router.get('/loans/:id/renewals',validateId,requirePermission('library.view'),asyncHandler(async(req,res)=>{
  const loan = (await query('SELECT id FROM library_loans WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId])).rows[0];
  if (!loan) throw new AppError('Loan not found.', 404, 'NOT_FOUND');
  const r = await query(
    `SELECT id, loan_id, previous_due_on::text AS previous_due_on, new_due_on::text AS new_due_on,
            renewal_number, renewed_by, renewed_at
     FROM library_loan_renewals
     WHERE loan_id = $1 AND tenant_id = $2
     ORDER BY renewal_number ASC`,
    [req.params.id, req.tenantId]
  );
  res.json({ data: r.rows });
}));

router.post('/loans/:id/return',validateId,requirePermission('library.issue'),validateBody(z.object({
  returnedOn: z.string().date(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'POOR']).optional(),
  notes: z.string().trim().max(2000).optional()
}).superRefine((data, ctx) => {
  if ((data.condition === 'DAMAGED' || data.condition === 'POOR') && (!data.notes || data.notes.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Damage notes of at least 3 characters are required for damaged or poor returns.'
    });
  }
})),asyncHandler(async(req,res)=>{
  const data=await transaction(async c=>{
    // Lock loan first
    const target=(await c.query('SELECT id, copy_id, status FROM library_loans WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId])).rows[0];
    if(!target)throw new AppError('Loan not found.',404,'NOT_FOUND');
    // Lock copy second
    const copy=(await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[target.copy_id,req.tenantId])).rows[0];
    if(!copy)throw new AppError('Copy not found.',404,'NOT_FOUND');
    // Lock book third
    await c.query('SELECT id, lifecycle_status FROM library_books WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[copy.book_id,req.tenantId]);

    const r=(await c.query(`UPDATE library_loans SET status='RETURNED',returned_on=$3 WHERE id=$1 AND tenant_id=$2 AND status='ISSUED' AND issued_on<=$3 RETURNING *`,[req.params.id,req.tenantId,req.body.returnedOn])).rows[0];
    if(!r)throw new AppError('Active loan or valid return date required.',409,'INVALID_LOAN_STATE');

    const assessedCondition = req.body.condition || 'GOOD';
    const isDamaged = assessedCondition === 'DAMAGED' || assessedCondition === 'POOR';
    const newCopyStatus = isDamaged ? 'DAMAGED' : 'ACTIVE';
    const action = isDamaged ? 'MARKED_DAMAGED' : 'ASSESSED';

    const incomingNotes = req.body.notes && req.body.notes.trim().length > 0 ? req.body.notes.trim() : null;
    if (isDamaged && (!incomingNotes || incomingNotes.length < 3)) {
      throw new AppError('Damage notes of at least 3 characters are required when returning a damaged or poor copy.', 422, 'NOTES_REQUIRED');
    }
    // Backward compatibility: do not erase current condition notes on clean return if notes omitted
    const updatedConditionNotes = incomingNotes !== null ? incomingNotes : (isDamaged ? null : copy.condition_notes);

    await c.query(
      `UPDATE book_copies
       SET status = $1, condition = $2, condition_notes = $3, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND tenant_id = $5`,
      [newCopyStatus, assessedCondition, updatedConditionNotes, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, loan_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, r.id, copy.status, newCopyStatus, copy.condition, assessedCondition, action, incomingNotes || (isDamaged ? null : 'Returned in clean condition'), req.user?.id || null]
    );

    if (isDamaged) {
      await logOperation(req, c, 'library', 'LIBRARY_COPY_DAMAGED', copy.id, {
        loanId: r.id,
        condition: assessedCondition,
        notes: incomingNotes
      });
    }

    await logOperation(req,c,'library','LIBRARY_COPY_RETURNED',r.id, {
      condition: assessedCondition,
      copyStatus: newCopyStatus,
      notes: incomingNotes
    });

    return { ...r, copyStatus: newCopyStatus, condition: assessedCondition };
  });
  res.json({data});
}));

router.post('/loans/:id/lost',validateId,requirePermission('library.issue'),validateBody(z.object({reason:z.string().trim().min(3).max(2000)})),asyncHandler(async(req,res)=>{
  const data=await transaction(async c=>{
    // Lock loan first
    const target=(await c.query('SELECT id, copy_id, status FROM library_loans WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId])).rows[0];
    if(!target)throw new AppError('Loan not found.',404,'NOT_FOUND');
    // Lock copy second
    const copy=(await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[target.copy_id,req.tenantId])).rows[0];
    if(!copy)throw new AppError('Copy not found.',404,'NOT_FOUND');
    // Lock book third
    await c.query('SELECT id, lifecycle_status FROM library_books WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[copy.book_id,req.tenantId]);

    const r=(await c.query(`UPDATE library_loans SET status='LOST' WHERE id=$1 AND tenant_id=$2 AND status='ISSUED' RETURNING *`,[req.params.id,req.tenantId])).rows[0];
    if(!r)throw new AppError('Active loan required.',409,'INVALID_LOAN_STATE');
    await c.query(`UPDATE book_copies SET status='LOST', assessed_at = CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2`,[target.copy_id,req.tenantId]);
    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, loan_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, $3, $4, 'LOST', $5, $5, 'ASSESSED', $6, $7, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, r.id, copy.status, copy.condition, req.body.reason, req.user?.id || null]
    );
    await logOperation(req,c,'library','LIBRARY_COPY_LOST',r.id,{reason:req.body.reason});
    return r;
  });
  res.json({data});
}));

router.post('/copies/:id/damage',validateId,requirePermission('library.manage'),validateBody(z.object({
  condition: z.enum(['DAMAGED', 'POOR']).default('DAMAGED'),
  reason: z.string().trim().min(3).max(2000),
  notes: z.string().trim().max(2000).optional()
})),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // Canonical lock order: copy -> book
    const copy = (await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
    if (copy.status === 'WITHDRAWN') throw new AppError('Withdrawn copies cannot be marked as damaged.', 409, 'ALREADY_WITHDRAWN');
    if (copy.status !== 'ACTIVE') throw new AppError(`Only active copies can be directly marked as damaged (current status: ${copy.status}).`, 409, 'INVALID_COPY_TRANSITION');

    const book = (await c.query('SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [copy.book_id, req.tenantId])).rows[0];
    if (!book || book.lifecycle_status !== 'ACTIVE') throw new AppError('Title is not active.', 409, 'INVALID_COPY_TRANSITION');

    const activeLoan = (await c.query(`SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED' LIMIT 1`, [copy.id, req.tenantId])).rowCount;
    if (activeLoan) throw new AppError('Cannot mark copy as damaged while on active loan. Process damage via loan return.', 409, 'ACTIVE_LOAN_EXISTS');

    const combinedNotes = b.notes ? `${b.reason} — ${b.notes}` : b.reason;
    await c.query(
      `UPDATE book_copies
       SET status = 'DAMAGED', condition = $1, condition_notes = $2, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND tenant_id = $4`,
      [b.condition, combinedNotes, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, $3, 'DAMAGED', $4, $5, 'MARKED_DAMAGED', $6, $7, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, copy.status, copy.condition, b.condition, combinedNotes, req.user?.id || null]
    );

    await logOperation(req, c, 'library', 'LIBRARY_COPY_DAMAGED', copy.id, {
      previousStatus: copy.status,
      condition: b.condition,
      reason: b.reason,
      notes: b.notes
    });

    return { id: copy.id, status: 'DAMAGED', condition: b.condition, condition_notes: combinedNotes };
  });
  res.json({ data });
}));

router.post('/copies/:id/repair-start',validateId,requirePermission('library.manage'),validateBody(z.object({
  reason: z.string().trim().min(3).max(2000).optional(),
  notes: z.string().trim().max(2000).optional()
}).refine(data => (data.reason && data.reason.trim().length >= 3) || (data.notes && data.notes.trim().length >= 3), {
  message: 'Repair reason or dispatch notes of at least 3 characters are required.'
})),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // Canonical lock order: copy -> book
    const copy = (await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
    if (copy.status === 'WITHDRAWN') throw new AppError('Withdrawn copies cannot enter repair.', 409, 'ALREADY_WITHDRAWN');
    if (copy.status !== 'DAMAGED') throw new AppError(`Only damaged copies can enter repair (current status: ${copy.status}).`, 409, 'INVALID_COPY_TRANSITION');

    await c.query('SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [copy.book_id, req.tenantId]);

    const activeLoan = (await c.query(`SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED' LIMIT 1`, [copy.id, req.tenantId])).rowCount;
    if (activeLoan) throw new AppError('Cannot start repair while an active loan exists for this copy.', 409, 'ACTIVE_LOAN_EXISTS');

    const repairNotes = b.notes ? (b.reason ? `${b.reason} — ${b.notes}` : `Repair started: ${b.notes}`) : (b.reason ? `Repair started: ${b.reason}` : 'Sent for repair/rebinding');
    await c.query(
      `UPDATE book_copies
       SET status = 'UNDER_REPAIR', condition_notes = $1, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [repairNotes, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, 'DAMAGED', 'UNDER_REPAIR', $3, $3, 'REPAIR_STARTED', $4, $5, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, copy.condition, repairNotes, req.user?.id || null]
    );

    await logOperation(req, c, 'library', 'LIBRARY_COPY_REPAIR_STARTED', copy.id, {
      reason: b.reason,
      notes: b.notes
    });

    return { id: copy.id, status: 'UNDER_REPAIR', condition: copy.condition, condition_notes: repairNotes };
  });
  res.json({ data });
}));

router.post('/copies/:id/repair-complete',validateId,requirePermission('library.manage'),validateBody(z.object({
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR']).default('GOOD'),
  notes: z.string().trim().min(3).max(2000),
  repairCost: z.number().min(0).max(100000).optional()
})),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // Canonical lock order: copy -> book
    const copy = (await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
    if (copy.status === 'WITHDRAWN') throw new AppError('Withdrawn copies cannot be repaired.', 409, 'ALREADY_WITHDRAWN');
    if (copy.status !== 'UNDER_REPAIR') {
      throw new AppError(`Only copies currently under repair can complete repair (current status: ${copy.status}).`, 409, 'INVALID_COPY_TRANSITION');
    }

    const book = (await c.query('SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [copy.book_id, req.tenantId])).rows[0];
    if (!book || book.lifecycle_status !== 'ACTIVE') {
      throw new AppError('Cannot complete repair because parent title is archived or not in active circulation.', 409, 'TITLE_NOT_ACTIVE');
    }

    const activeLoan = (await c.query(`SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED' LIMIT 1`, [copy.id, req.tenantId])).rowCount;
    if (activeLoan) throw new AppError('Cannot complete repair while an active loan exists for this copy.', 409, 'ACTIVE_LOAN_EXISTS');

    const completedNotes = `Repair completed: ${b.notes}`;
    const cost = b.repairCost !== undefined ? Number(b.repairCost) : null;

    await c.query(
      `UPDATE book_copies
       SET status = 'ACTIVE', condition = $1, condition_notes = $2, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND tenant_id = $4`,
      [b.condition, completedNotes, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, repair_cost, performed_by, created_at
       ) VALUES ($1, $2, 'UNDER_REPAIR', 'ACTIVE', $3, $4, 'REPAIRED', $5, $6, $7, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, copy.condition, b.condition, completedNotes, cost, req.user?.id || null]
    );

    await logOperation(req, c, 'library', 'LIBRARY_COPY_REPAIRED', copy.id, {
      previousStatus: copy.status,
      condition: b.condition,
      repairCost: cost,
      notes: b.notes
    });

    return { id: copy.id, status: 'ACTIVE', condition: b.condition, condition_notes: completedNotes, repairCost: cost };
  });
  res.json({ data });
}));

router.post('/copies/:id/repair-failed',validateId,requirePermission('library.manage'),validateBody(z.object({
  condition: z.enum(['DAMAGED', 'POOR']).default('DAMAGED').optional(),
  reason: z.string().trim().min(3).max(2000),
  notes: z.string().trim().max(2000).optional()
})),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // Canonical lock order: copy -> book
    const copy = (await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
    if (copy.status === 'WITHDRAWN') throw new AppError('Withdrawn copies cannot be modified.', 409, 'ALREADY_WITHDRAWN');
    if (copy.status !== 'UNDER_REPAIR') {
      throw new AppError(`Only copies currently under repair can be reported as repair failed (current status: ${copy.status}).`, 409, 'INVALID_COPY_TRANSITION');
    }

    await c.query('SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [copy.book_id, req.tenantId]);

    const activeLoan = (await c.query(`SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED' LIMIT 1`, [copy.id, req.tenantId])).rowCount;
    if (activeLoan) throw new AppError('Active loan conflict on repair failure.', 409, 'ACTIVE_LOAN_EXISTS');

    const assessedCondition = b.condition || 'DAMAGED';
    const failureReason = b.notes ? `${b.reason} — ${b.notes}` : b.reason;

    await c.query(
      `UPDATE book_copies
       SET status = 'DAMAGED', condition = $1, condition_notes = $2, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND tenant_id = $4`,
      [assessedCondition, failureReason, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, 'UNDER_REPAIR', 'DAMAGED', $3, $4, 'REPAIR_FAILED', $5, $6, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, copy.condition, assessedCondition, failureReason, req.user?.id || null]
    );

    await logOperation(req, c, 'library', 'LIBRARY_COPY_REPAIR_FAILED', copy.id, {
      previousStatus: copy.status,
      condition: assessedCondition,
      reason: b.reason,
      notes: b.notes
    });

    return { id: copy.id, status: 'DAMAGED', condition: assessedCondition, condition_notes: failureReason };
  });
  res.json({ data });
}));

router.post('/copies/:id/withdraw',validateId,requirePermission('library.manage'),validateBody(z.object({
  reason: z.enum(['Severe Damage', 'Obsolescence', 'Duplicate Stock', 'Lost / Unrecoverable', 'Other Authorized Reason']),
  notes: z.string().trim().max(2000).optional(),
  expectedStatus: z.enum(['ACTIVE', 'DAMAGED', 'UNDER_REPAIR']).optional()
}).superRefine((data, ctx) => {
  if (data.reason === 'Other Authorized Reason' && (!data.notes || data.notes.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Additional explanation notes of at least 3 characters are required when selecting Other Authorized Reason.'
    });
  }
})),asyncHandler(async(req,res)=>{
  const b = req.body;
  const data = await transaction(async c => {
    // Canonical lock order: copy -> book
    const copy = (await c.query('SELECT id, book_id, status, condition, condition_notes FROM book_copies WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
    if (copy.status === 'WITHDRAWN') throw new AppError('Copy is already withdrawn from circulation.', 409, 'ALREADY_WITHDRAWN');
    if (copy.status === 'LOST') throw new AppError('Lost copies cannot be withdrawn through this workflow.', 409, 'INVALID_COPY_TRANSITION');
    if (!['ACTIVE', 'DAMAGED', 'UNDER_REPAIR'].includes(copy.status)) {
      throw new AppError(`Copies in ${copy.status} state cannot be withdrawn through this workflow.`, 409, 'INVALID_COPY_TRANSITION');
    }
    if (b.expectedStatus && copy.status !== b.expectedStatus) {
      throw new AppError(`Copy state conflict: expected status ${b.expectedStatus} but copy is currently ${copy.status}.`, 409, 'INVALID_COPY_TRANSITION');
    }

    await c.query('SELECT id, lifecycle_status FROM library_books WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [copy.book_id, req.tenantId]);

    const activeLoan = (await c.query(`SELECT id FROM library_loans WHERE copy_id = $1 AND tenant_id = $2 AND status = 'ISSUED' LIMIT 1`, [copy.id, req.tenantId])).rowCount;
    if (activeLoan) throw new AppError('Cannot withdraw a copy that currently has an active loan.', 409, 'ACTIVE_LOANS_EXIST');

    const withdrawalReason = b.notes ? `${b.reason} — ${b.notes}` : b.reason;
    await c.query(
      `UPDATE book_copies
       SET status = 'WITHDRAWN', condition_notes = $1, assessed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [withdrawalReason, copy.id, req.tenantId]
    );

    await c.query(
      `INSERT INTO library_copy_condition_logs (
         tenant_id, copy_id, previous_status, new_status, previous_condition, new_condition, action, reason, performed_by, created_at
       ) VALUES ($1, $2, $3, 'WITHDRAWN', $4, $4, 'WITHDRAWN', $5, $6, CURRENT_TIMESTAMP)`,
      [req.tenantId, copy.id, copy.status, copy.condition, withdrawalReason, req.user?.id || null]
    );

    await logOperation(req, c, 'library', 'LIBRARY_COPY_WITHDRAWN', copy.id, {
      previousStatus: copy.status,
      reason: b.reason,
      notes: b.notes
    });

    return { id: copy.id, status: 'WITHDRAWN', condition: copy.condition, condition_notes: withdrawalReason };
  });
  res.json({ data });
}));

router.get('/copies/:id/condition-logs',validateId,requirePermission('library.view'),asyncHandler(async(req,res)=>{
  const copy = (await query('SELECT id FROM book_copies WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId])).rows[0];
  if (!copy) throw new AppError('Copy not found.', 404, 'NOT_FOUND');
  const r = await query(
    `SELECT cl.*, COALESCE(NULLIF(TRIM(p.display_name), ''), 'Authorized user') AS performed_by_name
     FROM library_copy_condition_logs cl
     LEFT JOIN users u ON u.id = cl.performed_by
     LEFT JOIN profiles p ON p.id = u.id
     WHERE cl.copy_id = $1 AND cl.tenant_id = $2
     ORDER BY cl.created_at DESC`,
    [req.params.id, req.tenantId]
  );
  res.json({ data: r.rows });
}));

router.use((_req,_res,next)=>next(new AppError('Library endpoint not found.',404,'NOT_FOUND')));
router.use(operationError);
export default router;

