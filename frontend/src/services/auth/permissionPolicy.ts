export type PermissionUser = { id: string; tenantId: string; role: string; status?: string; permissions?: string[]; linkedStudentIds?: string[] };
export function hasPermission(user: PermissionUser, permission: string, tenantId = user.tenantId): boolean {
  if (!user.id || user.status !== 'ACTIVE') return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.tenantId === tenantId && !!user.permissions?.includes(permission);
}
// Module access for V1. `view` keys are database permissions; `roles` cover
// portals whose API checks ownership (a parent's children, a student's self).
export const MODULE_ACCESS: Record<string, { view?: string[]; roles?: string[]; write?: string[] }> = {
 dashboard: {},
 students: {view:['student_lifecycle.view'],write:['student_lifecycle.manage','student_documents.manage']},
 staff: {view:['staff.view'],write:['staff.manage','teacher_accounts.manage']},
 attendance: {roles:['PARENT','STUDENT'],view:['attendance.view'],write:['attendance.manage']},
 timetable: {roles:['STUDENT'],view:['timetable.view'],write:['timetable.manage']},
 exams: {view:['examinations.view'],write:['examinations.manage','exam_marks.manage']},
 results: {roles:['PARENT','STUDENT'],view:['exam_marks.view'],write:['exam_marks.manage']},
 homework: {view:['homework.view'],write:['homework.manage']},
 fees: {roles:['PARENT','STUDENT'],view:['fee_management.view'],write:['fee_management.manage','payment_settings.manage','payment_proofs.submit','payment_proofs.verify']},
 communication: {view:['communications.view'],write:['communications.send','communications.templates.manage']},
 reports: {roles:['TENANT_ADMIN','ACCOUNTANT','TEACHER'],view:['fee_reports.view']},
 organization: {view:['users.view'],write:['users.invite','users.manage']},
 'master-data': {view:['master_data.view'],write:['master_data.manage']},
 'saas-billing': {roles:['TENANT_ADMIN','SUPER_ADMIN']},
 'superadmin-dashboard': {roles:['SUPER_ADMIN']},
 'superadmin-tenants': {roles:['SUPER_ADMIN'],write:['tenants.manage']},
 'superadmin-plans': {roles:['SUPER_ADMIN'],write:['subscriptions.manage']},
};
export function canOpenModule(user: PermissionUser, module: string): boolean {
  if (!user.id || user.status !== 'ACTIVE') return false;
  const rule = MODULE_ACCESS[module];
  if (!rule) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const matchesRole = rule.roles ? rule.roles.includes(user.role) : false;
  const matchesPermission = rule.view && rule.view.length > 0 ? rule.view.some(p => hasPermission(user, p)) : false;

  if (rule.roles && (!rule.view || rule.view.length === 0)) {
    return matchesRole;
  }
  if (!rule.roles && rule.view && rule.view.length > 0) {
    return matchesPermission;
  }
  if (rule.roles && rule.view && rule.view.length > 0) {
    return matchesRole || matchesPermission;
  }
  return true;
}
