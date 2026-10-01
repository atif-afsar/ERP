export interface CalculatedSubject { examSubjectId:string; subjectId:string; subjectName:string; maxMarks:number; passMarks:number; marks:number|null; absent:boolean; passed:boolean; }
export interface GradeBand { grade:string; min_percentage:number|string; max_percentage:number|string; grade_point?:number|string|null; remarks?:string|null; }
export function calculateResult(subjects:CalculatedSubject[],bands:GradeBand[]){
  const totalMarks=subjects.reduce((n,s)=>n+s.maxMarks,0);
  const obtainedMarks=subjects.reduce((n,s)=>n+(s.marks||0),0);
  const percentage=totalMarks?Number(((obtainedMarks/totalMarks)*100).toFixed(2)):0;
  const passed=subjects.length>0&&subjects.every(s=>s.passed);
  const band=[...bands].sort((a,b)=>Number(b.min_percentage)-Number(a.min_percentage)).find(b=>percentage>=Number(b.min_percentage)&&percentage<=Number(b.max_percentage));
  return{subjects,totalMarks,obtainedMarks,percentage,grade:band?.grade||null,gradePoint:band?.grade_point==null?null:Number(band.grade_point),gradeRemarks:band?.remarks||null,passed,resultStatus:passed?'PASS':'FAIL'};
}
