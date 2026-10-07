import test from 'node:test';import assert from 'node:assert/strict';import {attendanceScopeSchema,attendanceBulkSchema} from '../src/services/attendanceValidation.ts';
const scope={academicYearId:'11111111-1111-4111-8111-111111111111',classId:'22222222-2222-4222-8222-222222222222',sectionId:'33333333-3333-4333-8333-333333333333',date:'2026-10-07'};
const row={enrollmentId:'44444444-4444-4444-8444-444444444444',status:'PRESENT'};
test('valid academic attendance scope accepted',()=>assert.equal(attendanceScopeSchema.safeParse(scope).success,true));
test('missing and malformed scope rejected before SQL',()=>{assert.equal(attendanceScopeSchema.safeParse({...scope,sectionId:''}).success,false);assert.equal(attendanceScopeSchema.safeParse({...scope,classId:'not-uuid'}).success,false);});
test('impossible calendar date rejected',()=>assert.equal(attendanceScopeSchema.safeParse({...scope,date:'2026-02-30'}).success,false));
test('duplicate enrollments rejected rather than overwritten',()=>assert.equal(attendanceBulkSchema.safeParse({...scope,records:[row,{...row,status:'ABSENT'}]}).success,false));
test('empty and oversized bulk rejected',()=>{assert.equal(attendanceBulkSchema.safeParse({...scope,records:[]}).success,false);assert.equal(attendanceBulkSchema.safeParse({...scope,records:Array(201).fill(row)}).success,false);});
test('valid marks accepted and unknown status rejected',()=>{assert.equal(attendanceBulkSchema.safeParse({...scope,records:[row]}).success,true);assert.equal(attendanceBulkSchema.safeParse({...scope,records:[{...row,status:'PAID'}]}).success,false);});
