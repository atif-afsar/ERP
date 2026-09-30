import {apiClient} from './api/apiClient';
const base='/api/v1/students';const cfg=(tenantId:string)=>({tenantId});
export const studentLifecycleService={
 list:(tenantId:string,params:Record<string,string|number|undefined>={})=>{const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!=='')q.set(k,String(v))});return apiClient.request<any[]>(`${base}?${q}`,cfg(tenantId))},
 get:(tenantId:string,id:string)=>apiClient.request<any>(`${base}/${id}`,cfg(tenantId)),
 admit:(tenantId:string,body:any)=>apiClient.request<any>(`${base}/admissions`,{method:'POST',body,tenantId}),
 update:(tenantId:string,id:string,body:any)=>apiClient.request<any>(`${base}/${id}`,{method:'PATCH',body,tenantId}),
 addParent:(tenantId:string,id:string,body:any)=>apiClient.request<any>(`${base}/${id}/parents`,{method:'POST',body,tenantId}),
 addEnrollment:(tenantId:string,id:string,body:any)=>apiClient.request<any>(`${base}/${id}/enrollments`,{method:'POST',body,tenantId}),
 addDocument:(tenantId:string,id:string,body:any)=>apiClient.request<any>(`${base}/${id}/documents`,{method:'POST',body,tenantId}),
 removeDocument:(tenantId:string,id:string,documentId:string)=>apiClient.request<any>(`${base}/${id}/documents/${documentId}`,{method:'DELETE',tenantId}),
};
