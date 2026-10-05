import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const KNOWN_UNIQUE_CONSTRAINTS: Record<string, { code: string; message: string }> = {
  // Student admission identity
  students_tenant_id_admission_no_key: {
    code: 'ADMISSION_NUMBER_EXISTS',
    message: 'A student with this admission number already exists in this institution.',
  },
  // Yearly enrollment
  uq_enrollments_student_year: {
    code: 'DUPLICATE_YEAR_ENROLLMENT',
    message: 'This student is already enrolled in this academic year.',
  },
  // Academic year
  uq_academic_years_tenant_name: {
    code: 'DUPLICATE_ACADEMIC_YEAR',
    message: 'An academic year with this name already exists in this institution.',
  },
  // Fee payment proofs
  payment_proofs_tenant_id_transaction_reference_key: {
    code: 'DUPLICATE_TRANSACTION_REFERENCE',
    message: 'A payment proof with this transaction reference already exists.',
  },
  // Parent accounts
  uq_parents_tenant_user: {
    code: 'PARENT_ALREADY_LINKED',
    message: 'This parent account is already linked in this institution.',
  },
  // Staff
  staff_tenant_id_employee_id_key: {
    code: 'EMPLOYEE_ID_EXISTS',
    message: 'A staff member with this employee ID already exists.',
  },
  // SaaS plan code
  subscription_plans_code_key: {
    code: 'PLAN_CODE_EXISTS',
    message: 'A subscription plan with this code already exists.',
  },
};

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal error occurred.';

  // Intercept PostgreSQL unique constraint violation (SQLSTATE 23505)
  if (err.code === '23505') {
    statusCode = 409;
    const constraint = err.constraint ? KNOWN_UNIQUE_CONSTRAINTS[err.constraint] : null;
    if (constraint) {
      code = constraint.code;
      message = constraint.message;
    } else {
      code = 'DUPLICATE_RECORD';
      message = 'A record with duplicate unique details already exists.';
    }
  } else if (statusCode >= 500) {
    // Mask raw SQL, constraint internals, and stack traces on 500 errors
    if (process.env.NODE_ENV === 'production' || /error:|violates|constraint|syntax error/i.test(message)) {
      message = 'An unexpected internal error occurred.';
    }
  }

  const requestId = req.id || 'req_unknown';

  if (statusCode >= 500) {
    console.error(`[Error] [${requestId}]`, err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details: statusCode >= 500 ? null : (err.details || null),
      requestId,
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
