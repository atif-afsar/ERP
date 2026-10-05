export type PermissionUser = { id: string; tenantId: string; role: string; status?: string; permissions?: string[]; linkedStudentIds?: string[] };
export function hasPermission(user: PermissionUser, permission: string, tenantId = user.tenantId): boolean {
  if (!user.id || user.status !== 'ACTIVE') return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.tenantId === tenantId && !!user.permissions?.includes(permission);
}
// Existing API exceptions use canonical roles, not invented database permissions.
export const MODULE_ACCESS: Record<string, { view?: string[]; roles?: string[]; write?: string[]; prototype?: boolean }> = {
 dashboard: {}, students: {view:['student_lifecycle.view'],write:['student_lifecycle.manage','student_documents.manage','parent_accounts.manage']},
 'students/new': {view:['student_lifecycle.manage'],write:['student_lifecycle.manage']},
 staff: {view:['staff.view'],write:['staff.manage','teacher_accounts.manage']},
 hr: {view:['hr.view','hr.leave.request'],write:['hr.manage','hr.leave.approve','hr.leave.request']},
 academics: {view:['master_data.view'],prototype:true}, attendance: {view:['attendance.view'],write:['attendance.manage']},
 'attendance/mark': {view:['attendance.manage'],write:['attendance.manage']},
 fees: {view:['fee_management.view'],write:['fee_management.manage','payment_settings.manage','payment_proofs.submit','payment_proofs.verify']},
 'fees/new': {view:['fee_management.manage'],write:['fee_management.manage']},
 finance: {roles:['TENANT_ADMIN','ACCOUNTANT'],write:[]},
 inventory: {view:['inventory.view'],write:['inventory.manage']},library:{view:['library.view'],write:['library.manage','library.issue']},
 transport:{view:['transport.view'],write:['transport.manage']},hostel:{view:['hostel.view'],write:['hostel.manage']},mess:{view:['mess.view'],write:['mess.manage']},
 health:{view:['health.view'],prototype:true},exams:{view:['examinations.view'],write:['examinations.manage','exam_marks.manage']},
 results:{view:['exam_marks.view'],write:['exam_marks.manage']},timetable:{view:['timetable.view'],write:['timetable.manage']},
 homework:{view:['homework.view'],prototype:true},communication:{view:['communications.view','communications.send'],write:['communications.send','communications.templates.manage']},
 crm:{view:['students.create'],prototype:true},reports:{view:['reports.view'],prototype:true},settings:{view:['settings.view'],prototype:true},
 organization:{view:['users.view','roles.view'],write:['users.invite','users.manage','roles.manage']},'master-data':{view:['master_data.view'],write:['master_data.manage']},
 'api-docs':{roles:['SUPER_ADMIN','TENANT_ADMIN'],view:['organization.view'],prototype:true},schema:{roles:['SUPER_ADMIN','TENANT_ADMIN'],view:['organization.view'],prototype:true},'roles-matrix':{view:['roles.view'],prototype:true},
 'superadmin-dashboard':{roles:['SUPER_ADMIN'],prototype:true},'superadmin-tenants':{roles:['SUPER_ADMIN'],write:['tenants.manage']},
 'superadmin-plans':{roles:['SUPER_ADMIN'],write:['subscriptions.manage']},'superadmin-features':{roles:['SUPER_ADMIN'],prototype:true},
 'saas-billing':{roles:['TENANT_ADMIN','SUPER_ADMIN']}
};
export function canOpenModule(user: PermissionUser, module: string): boolean {
 if (!user.id || user.status !== 'ACTIVE') return false;
 const rule=MODULE_ACCESS[module]; if (!rule) return false;
 if (rule.roles) return rule.roles.includes(user.role) || user.role==='SUPER_ADMIN';
 return !rule.view || rule.view.some(p=>hasPermission(user,p));
}
