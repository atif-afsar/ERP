import {apiClient} from './api/apiClient';
const q=(p:Record<string,string>)=>new URLSearchParams(p).toString();
export const academicOperationsService={
 listStaff:(t:string)=>apiClient.request<any[]>('/api/v1/staff',{tenantId:t}),createStaff:(t:string,b:any)=>apiClient.request<any>('/api/v1/staff',{method:'POST',body:b,tenantId:t}),inviteTeacher:(t:string,id:string)=>apiClient.request<any>(`/api/v1/staff/${id}/invitation`,{method:'POST',body:{},tenantId:t}),
 listAssignments:(t:string)=>apiClient.request<any[]>('/api/v1/staff/assignments',{tenantId:t}),createAssignment:(t:string,b:any)=>apiClient.request<any>('/api/v1/staff/assignments',{method:'POST',body:b,tenantId:t}),deleteAssignment:(t:string,id:string)=>apiClient.request<any>(`/api/v1/staff/assignments/${id}`,{method:'DELETE',tenantId:t}),
 teachingContext:(t:string)=>apiClient.request<any[]>('/api/v1/staff/teaching-context',{tenantId:t}),
 listTimetable:(t:string,p:Record<string,string>)=>apiClient.request<any[]>(`/api/v1/timetable?${q(p)}`,{tenantId:t}),createTimetable:(t:string,b:any)=>apiClient.request<any>('/api/v1/timetable',{method:'POST',body:b,tenantId:t}),deleteTimetable:(t:string,id:string)=>apiClient.request<any>(`/api/v1/timetable/${id}`,{method:'DELETE',tenantId:t}),
 roster:(t:string,p:Record<string,string>)=>apiClient.request<any[]>(`/api/v1/attendance/roster?${q(p)}`,{tenantId:t}),saveAttendance:(t:string,b:any)=>apiClient.request<any[]>('/api/v1/attendance/bulk',{method:'POST',body:b,tenantId:t}),
};
