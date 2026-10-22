import {apiClient} from './api/apiClient';
const base='/api/v1/hr';
export type SalaryComponent={name:string;amount:number};
export const hrService={
 me:(t:string)=>apiClient.request<{staff:{id:string;name:string;status:string}|null}>(`${base}/me`,{tenantId:t}),
 staff:(t:string)=>apiClient.request<any[]>(`${base}/staff`,{tenantId:t}),
 dashboard:(t:string)=>apiClient.request<Record<string,number>>(`${base}/dashboard`,{tenantId:t}),
 // Leave
 leaveTypes:(t:string)=>apiClient.request<any[]>(`${base}/types`,{tenantId:t}),
 createLeaveType:(t:string,b:{name:string;paid:boolean})=>apiClient.request<any>(`${base}/types`,{method:'POST',body:b,tenantId:t}),
 setLeaveTypeActive:(t:string,id:string,active:boolean)=>apiClient.request<any>(`${base}/types/${id}`,{method:'PATCH',body:{active},tenantId:t}),
 balances:(t:string)=>apiClient.request<any[]>(`${base}/balances`,{tenantId:t}),
 setBalance:(t:string,b:{staffId:string;leaveTypeId:string;year:number;entitlement:number})=>apiClient.request<any>(`${base}/balances`,{method:'PUT',body:b,tenantId:t}),
 requests:(t:string)=>apiClient.request<any[]>(`${base}/requests`,{tenantId:t}),
 requestLeave:(t:string,b:{leaveTypeId:string;startDate:string;endDate:string;reason:string})=>apiClient.request<any>(`${base}/requests`,{method:'POST',body:b,tenantId:t}),
 cancelLeave:(t:string,id:string)=>apiClient.request<any>(`${base}/requests/${id}/cancel`,{method:'POST',body:{},tenantId:t}),
 reviewLeave:(t:string,id:string,status:'APPROVED'|'REJECTED',note='')=>apiClient.request<any>(`${base}/requests/${id}/review`,{method:'POST',body:{status,note},tenantId:t}),
 revokeLeave:(t:string,id:string,reason:string)=>apiClient.request<any>(`${base}/requests/${id}/revoke`,{method:'POST',body:{reason},tenantId:t}),
 // Staff attendance
 attendance:(t:string,date:string)=>apiClient.request<any[]>(`${base}/attendance?date=${encodeURIComponent(date)}`,{tenantId:t}),
 saveAttendance:(t:string,date:string,entries:{staffId:string;status:string}[])=>apiClient.request<{saved:number}>(`${base}/attendance/bulk`,{method:'PUT',body:{date,entries},tenantId:t}),
 // Payroll
 salaries:(t:string)=>apiClient.request<any[]>(`${base}/payroll/salaries`,{tenantId:t}),
 setSalary:(t:string,staffId:string,b:{basic:number;allowances:SalaryComponent[];deductions:SalaryComponent[];effectiveFrom?:string})=>apiClient.request<any>(`${base}/payroll/salaries/${staffId}`,{method:'PUT',body:b,tenantId:t}),
 runs:(t:string)=>apiClient.request<any[]>(`${base}/payroll/runs`,{tenantId:t}),
 run:(t:string,id:string)=>apiClient.request<any>(`${base}/payroll/runs/${id}`,{tenantId:t}),
 createRun:(t:string,year:number,month:number)=>apiClient.request<any>(`${base}/payroll/runs`,{method:'POST',body:{year,month},tenantId:t}),
 recalculateRun:(t:string,id:string)=>apiClient.request<any>(`${base}/payroll/runs/${id}/recalculate`,{method:'POST',body:{},tenantId:t}),
 finalizeRun:(t:string,id:string)=>apiClient.request<any>(`${base}/payroll/runs/${id}/finalize`,{method:'POST',body:{},tenantId:t}),
 payRun:(t:string,id:string,paymentDate:string,reference:string)=>apiClient.request<any>(`${base}/payroll/runs/${id}/pay`,{method:'POST',body:{paymentDate,reference:reference||null},tenantId:t}),
 deleteRun:(t:string,id:string)=>apiClient.request<any>(`${base}/payroll/runs/${id}`,{method:'DELETE',tenantId:t}),
 myPayslips:(t:string)=>apiClient.request<any[]>(`${base}/payroll/my-payslips`,{tenantId:t}),
};
