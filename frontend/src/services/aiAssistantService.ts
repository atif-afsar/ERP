import {apiClient} from './api/apiClient';
const base='/api/v1/ai';
export interface AssistantReply{conversationId:string;messageId:string;reply:string;followUps:string[];actions:{label:string;route:string}[];citations:{sourceNumber:number;documentTitle:string}[];grounded:boolean}
export interface AssistantMessage{id:string;role:'USER'|'ASSISTANT';content:string;citations:{sourceNumber:number;documentTitle:string}[];created_at:string}
export const aiAssistantService={
 // Gemini can be slow under load and the server may retry on a fallback model.
 chat:(t:string,b:{message:string;conversationId?:string;currentRoute?:string})=>apiClient.request<AssistantReply>(`${base}/chat`,{method:'POST',body:b,tenantId:t,timeoutMs:75000}),
 conversations:(t:string)=>apiClient.request<{id:string;title:string;updated_at:string}[]>(`${base}/conversations`,{tenantId:t}),
 messages:(t:string,id:string)=>apiClient.request<AssistantMessage[]>(`${base}/conversations/${id}/messages`,{tenantId:t}),
 deleteConversation:(t:string,id:string)=>apiClient.request<any>(`${base}/conversations/${id}`,{method:'DELETE',tenantId:t}),
 feedback:(t:string,messageId:string,rating:1|-1)=>apiClient.request<any>(`${base}/feedback`,{method:'POST',body:{messageId,rating},tenantId:t}),
 knowledge:(t:string)=>apiClient.request<any[]>(`${base}/knowledge`,{tenantId:t}),
 addKnowledge:(t:string,b:{title:string;content:string;allowedRoles:string[]})=>apiClient.request<any>(`${base}/knowledge`,{method:'POST',body:b,tenantId:t}),
 removeKnowledge:(t:string,id:string)=>apiClient.request<any>(`${base}/knowledge/${id}`,{method:'DELETE',tenantId:t}),
};
// Public website (not signed in). History lives in the browser; nothing is stored.
export const publicAssistantService={
 chat:(message:string,history:{role:'USER'|'ASSISTANT';content:string}[])=>apiClient.request<{reply:string;followUps:string[];actions:{label:string;route:string}[]}>('/api/v1/public-assistant/chat',{method:'POST',body:{message,history:history.slice(-6)},timeoutMs:75000}),
};
