import { apiClient } from './api/apiClient';
export interface AppNotification{id:string;eventType:string;title:string;message:string;priority:string;createdAt:string;readAt:string|null;linkUrl:string|null}
export const notificationService={
  list:async(tenantId:string)=>(await apiClient.request<AppNotification[]>('/api/v1/notifications',{tenantId})).data,
  unreadCount:async(tenantId:string)=>(await apiClient.request<{count:number}>('/api/v1/notifications/unread-count',{tenantId})).data.count,
  markRead:(tenantId:string,id:string)=>apiClient.request(`/api/v1/notifications/${id}/read`,{method:'PATCH',tenantId}),
  markAllRead:(tenantId:string)=>apiClient.request('/api/v1/notifications/read-all',{method:'POST',tenantId}),
  preferences:(tenantId:string)=>apiClient.request<any>('/api/v1/notifications/preferences',{tenantId}),
  setPreference:(tenantId:string,input:{eventType:string;channel:'IN_APP'|'EMAIL';isEnabled:boolean})=>apiClient.request('/api/v1/notifications/preferences',{method:'PUT',tenantId,body:input}),
  overview:(tenantId:string)=>apiClient.request<any[]>('/api/v1/communication/overview',{tenantId}),
  templates:(tenantId:string)=>apiClient.request<any[]>('/api/v1/communication/templates',{tenantId}),
  deliveries:(tenantId:string)=>apiClient.request<any[]>('/api/v1/communication/deliveries',{tenantId}),
  sendFeeReminder:(tenantId:string,feeAssignmentId:string)=>apiClient.request('/api/v1/communication/fee-reminders',{method:'POST',tenantId,body:{feeAssignmentId}}),
};
