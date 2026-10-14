import React from 'react';
import { OperationsWorkbench,OperationForm,OperationTable } from '../operations/OperationsWorkbench';
const forms:OperationForm[]=[
 {title:'Update title status',path:b=>`/titles/${b.id}`,method:'PATCH',permission:'library.manage',fields:[{name:'id',label:'Title',type:'select',source:'titles'},{name:'status',label:'Status',type:'select',options:['ACTIVE','INACTIVE','ARCHIVED']}],transform:b=>({status:b.status})},
 {
  title:'Mark loan as lost',
  path:b=>`/loans/${b.id}/lost`,
  permission:'library.issue',
  fields:[
   {
    name:'id',
    label:'Loan',
    type:'select',
    source:'loans',
    filter:(l:any)=>l.status==='ISSUED',
    renderOption:(l:any)=>`${l.title} — ${l.accession_number} — ${l.borrower} (${l.borrower_type||(l.student_id?'Student':'Staff')}) — Due ${l.due_on}`,
    emptyPlaceholder:'No active loans available',
    renderDetail:(l:any)=>(
     <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
      <div className="font-semibold text-slate-800">{l.title}</div>
      <div className="text-slate-600">Copy Accession: <span className="font-mono font-medium text-slate-700">{l.accession_number}</span></div>
      <div className="text-slate-600">Borrower: <span className="font-medium text-slate-700">{l.borrower}</span> ({l.borrower_type||(l.student_id?'Student':'Staff')})</div>
      <div className="text-slate-600">Due Date: <span className="font-medium text-slate-700">{l.due_on}</span></div>
     </div>
    )
   },
   {name:'reason',label:'Reason'}
  ],
  transform:b=>({reason:b.reason})
 },
 {title:'Add category',path:'/categories',permission:'library.manage',fields:[{name:'name',label:'Category name'}]},
 {title:'Add title',path:'/titles',permission:'library.manage',fields:[{name:'title',label:'Title'},{name:'author',label:'Author'},{name:'isbn',label:'ISBN',optional:true,helperText:'Optional. Enter a valid ISBN-10 or ISBN-13; spaces and hyphens are accepted.'},{name:'categoryId',label:'Category',type:'select',source:'categories'}]},
 {
  title:'Add physical copy',
  path:'/copies',
  permission:'library.manage',
  fields:[
   {name:'bookId',label:'Title',type:'select',source:'titles',filter:(t:any)=>t.status==='ACTIVE',emptyPlaceholder:'No active titles available to add copies'},
   {name:'accessionNumber',label:'Accession number'}
  ]
 },
 ...(['STUDENT','STAFF'] as const).map(type=>({
  title:`Issue to ${type.toLowerCase()}`,
  path:'/loans',
  permission:'library.issue' as const,
  fields:[
   {
    name:'copyId',
    label:'Copy',
    type:'select' as const,
    source:'copies',
    filter:(cp:any)=>cp.availability==='ACTIVE'&&cp.status==='ACTIVE',
    renderOption:(cp:any)=>`${cp.title} — Accession: ${cp.accession_number}${cp.author&&cp.author.trim()?` — ${cp.author.trim()}`:''}`,
    emptyPlaceholder:'No available copies',
    renderDetail:(cp:any)=>(
     <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
      <div className="font-semibold text-slate-800">{cp.title}</div>
      <div className="text-slate-600">Accession Number: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
      {cp.author&&<div className="text-slate-600">Author: <span className="font-medium text-slate-700">{cp.author}</span></div>}
     </div>
    )
   },
   {
    name:'borrowerId',
    label:type==='STUDENT'?'Student':'Staff',
    type:'select' as const,
    source:type==='STUDENT'?'students':'staff',
    emptyPlaceholder:type==='STUDENT'?'No active students available':'No active staff available'
   },
   {name:'issuedOn',label:'Issue date',type:'date' as const},
   {name:'dueOn',label:'Due date',type:'date' as const}
  ],
  transform:(b:any)=>({...b,borrowerType:type})
 }))
];
const tables:OperationTable[]=[{title:'Catalog',source:'titles',columns:{title:'Title',author:'Author',category:'Category',total_copies:'Copies',available_copies:'Available',status:'Status'}},{title:'Physical copies',source:'copies',columns:{accession_number:'Accession',title:'Title',availability:'Availability'}},{title:'Loans',source:'loans',columns:{title:'Title',accession_number:'Copy',borrower:'Borrower',issued_on:'Issued',due_on:'Due',display_status:'Status'},action:{label:'Return today',permission:'library.issue',path:r=>`/loans/${r.id}/return`,body:()=>({returnedOn:new Date().toISOString().slice(0,10)}),show:r=>r.status==='ISSUED'}}];
export const LibraryOperationsModule:React.FC=()=> <OperationsWorkbench title="Library" module="library" forms={forms} tables={tables} note="Each loan tracks one physical copy. Legacy holds require reconciliation; no financial fines are posted."/>;
