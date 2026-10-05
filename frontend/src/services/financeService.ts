import {apiClient} from './api/apiClient';
export const financeService = {
 list:(tenantId:string,resource:string)=>apiClient.request<any[]>(`/api/v1/finance/${resource}`,{tenantId}),
 post:(tenantId:string,resource:string,body:any)=>apiClient.request<any>(`/api/v1/finance/${resource}`,{tenantId,method:'POST',body}),
};
