import { apiClient } from './api/apiClient';
const config = (tenantId:string) => ({tenantId});
const base = '/api/v1/master-data';
export const masterDataService = {
  getProfile:(t:string)=>apiClient.request<any>(`${base}/profile`,config(t)), updateProfile:(t:string,b:any)=>apiClient.request<any>(`${base}/profile`,{method:'PATCH',body:b,tenantId:t}),
  listYears:(t:string)=>apiClient.request<any[]>(`${base}/academic-years`,config(t)), createYear:(t:string,b:any)=>apiClient.request<any>(`${base}/academic-years`,{method:'POST',body:b,tenantId:t}), updateYear:(t:string,id:string,b:any)=>apiClient.request<any>(`${base}/academic-years/${id}`,{method:'PATCH',body:b,tenantId:t}),
  listBranches:(t:string)=>apiClient.request<any[]>(`${base}/branches`,config(t)), createBranch:(t:string,b:any)=>apiClient.request<any>(`${base}/branches`,{method:'POST',body:b,tenantId:t}), updateBranch:(t:string,id:string,b:any)=>apiClient.request<any>(`${base}/branches/${id}`,{method:'PATCH',body:b,tenantId:t}),
  listClasses:(t:string)=>apiClient.request<any[]>(`${base}/classes`,config(t)), createClass:(t:string,b:any)=>apiClient.request<any>(`${base}/classes`,{method:'POST',body:b,tenantId:t}),
  listSections:(t:string)=>apiClient.request<any[]>(`${base}/sections`,config(t)), createSection:(t:string,b:any)=>apiClient.request<any>(`${base}/sections`,{method:'POST',body:b,tenantId:t}),
  listSubjects:(t:string)=>apiClient.request<any[]>(`${base}/subjects`,config(t)), createSubject:(t:string,b:any)=>apiClient.request<any>(`${base}/subjects`,{method:'POST',body:b,tenantId:t}),
  listAssignments:(t:string)=>apiClient.request<any[]>(`${base}/teacher-assignments`,config(t)), createAssignment:(t:string,b:any)=>apiClient.request<any>(`${base}/teacher-assignments`,{method:'POST',body:b,tenantId:t}), removeAssignment:(t:string,id:string)=>apiClient.request<any>(`${base}/teacher-assignments/${id}`,{method:'DELETE',tenantId:t}),
  listStaff:(t:string)=>apiClient.request<any[]>('/api/v1/staff',config(t)),
};
