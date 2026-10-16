import {apiClient} from './api/apiClient';
const q=(p:Record<string,string>)=>new URLSearchParams(p).toString();
export const academicOperationsService={
 listStaff:(t:string)=>apiClient.request<any[]>('/api/v1/staff',{tenantId:t}),createStaff:(t:string,b:any)=>apiClient.request<any>('/api/v1/staff',{method:'POST',body:b,tenantId:t}),inviteTeacher:(t:string,id:string)=>apiClient.request<any>(`/api/v1/staff/${id}/invitation`,{method:'POST',body:{},tenantId:t}),
 listAssignments:(t:string)=>apiClient.request<any[]>('/api/v1/staff/assignments',{tenantId:t}),createAssignment:(t:string,b:any)=>apiClient.request<any>('/api/v1/staff/assignments',{method:'POST',body:b,tenantId:t}),deleteAssignment:(t:string,id:string)=>apiClient.request<any>(`/api/v1/staff/assignments/${id}`,{method:'DELETE',tenantId:t}),
 teachingContext:(t:string)=>apiClient.request<any[]>('/api/v1/staff/teaching-context',{tenantId:t}),
 listTimetable:(t:string,p:Record<string,string>)=>apiClient.request<any[]>(`/api/v1/timetable?${q(p)}`,{tenantId:t}),createTimetable:(t:string,b:any)=>apiClient.request<any>('/api/v1/timetable',{method:'POST',body:b,tenantId:t}),deleteTimetable:(t:string,id:string)=>apiClient.request<any>(`/api/v1/timetable/${id}`,{method:'DELETE',tenantId:t}),
 roster:(t:string,p:Record<string,string>)=>apiClient.request<any[]>(`/api/v1/attendance/roster?${q(p)}`,{tenantId:t}),
 saveAttendance:(t:string,b:any)=>apiClient.request<any[]>('/api/v1/attendance/bulk',{method:'POST',body:b,tenantId:t}),
 correctAttendance:(t:string,b:any)=>apiClient.request<any>('/api/v1/attendance/correct',{method:'POST',body:b,tenantId:t}),
 getHistory:(t:string,enrollmentId:string)=>apiClient.request<any>(`/api/v1/attendance/history/${enrollmentId}`,{tenantId:t}),
 createQrSession:(t:string,b:any)=>apiClient.request<any>('/api/v1/attendance/qr/sessions',{method:'POST',body:b,tenantId:t}),
 getActiveQrSession:(t:string,p:Record<string,string>)=>apiClient.request<any>(`/api/v1/attendance/qr/sessions/active?${q(p)}`,{tenantId:t}),
 getQrSession:(t:string,id:string)=>apiClient.request<any>(`/api/v1/attendance/qr/sessions/${id}`,{tenantId:t}),
 closeQrSession:(t:string,id:string)=>apiClient.request<any>(`/api/v1/attendance/qr/sessions/${id}/close`,{method:'POST',body:{},tenantId:t}),
 revokeQrSession:(t:string,id:string,reason?:string)=>apiClient.request<any>(`/api/v1/attendance/qr/sessions/${id}/revoke`,{method:'POST',body:{reason},tenantId:t}),
 qrCheckIn:(t:string,b:any)=>apiClient.request<any>('/api/v1/attendance/qr/check-in',{method:'POST',body:b,tenantId:t}),
 getSelfAttendance:(t:string)=>apiClient.request<any>('/api/v1/attendance/self',{tenantId:t}),
 getChildAttendance:(t:string,childId:string,p?:Record<string,string>)=>apiClient.request<any>(`/api/v1/attendance/children/${childId}${p?'?'+q(p):''}`,{tenantId:t}),
 getAttendanceSummary:(t:string,p:Record<string,string>)=>apiClient.request<any>(`/api/v1/attendance/reports/summary?${q(p)}`,{tenantId:t}),
};
