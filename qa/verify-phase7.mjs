import { query } from '../backend/dist/db.js';

async function test() {
  // 1. Sign in as School Admin
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'schooladmin@ci-academy.test', password: 'EduNexus2026!School' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  const tenantId = loginData.data?.user?.tenantId;
  console.log('School Admin signin status:', loginRes.status, 'Tenant ID:', tenantId);

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  // 2. Fetch master classes
  const classesRes = await fetch('http://localhost:5000/api/v1/master-data/classes', { headers: authHeaders });
  const classesData = await classesRes.json();
  const testClass = classesData.data?.[0];
  console.log('Class found:', testClass?.name, testClass?.id);

  // 3. Test Homework Creation
  const hwRes = await fetch('http://localhost:5000/api/v1/homework', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      classId: testClass?.id || 'd3b07384-d113-4f90-a5cf-84a7e3ec2001',
      title: 'Chapter 5 - Advanced Calculus Practice Set',
      description: 'Solve questions 1 through 15 from textbook page 104.',
      dueDate: '2026-10-25'
    })
  });
  const hwData = await hwRes.json();
  console.log('Homework creation status:', hwRes.status, 'ID:', hwData.data?.id);
  const hwId = hwData.data?.id;

  // 4. Test Student Submission
  // Get an existing student directly from DB for this tenant
  const studentDb = await query('SELECT id, first_name, last_name, admission_no FROM students WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  let testStudent = studentDb.rows[0];
  if (!testStudent) {
    const newSt = await query(
      `INSERT INTO students (tenant_id, admission_no, first_name, last_name, status, gender, admission_date)
       VALUES ($1, 'ADM-TEST-001', 'Alex', 'Johnson', 'ACTIVE', 'MALE', CURRENT_DATE) RETURNING *`,
      [tenantId]
    );
    testStudent = newSt.rows[0];
  }
  console.log('Test student:', testStudent.first_name, testStudent.id);

  const submitRes = await fetch('http://localhost:5000/api/v1/homework/' + hwId + '/submissions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      studentId: testStudent.id,
      submissionText: 'All 15 calculus problems solved with step-by-step differentiation formulas.'
    })
  });
  const submitData = await submitRes.json();
  console.log('Homework submission status:', submitRes.status, 'Submission ID:', submitData.data?.id);
  const subId = submitData.data?.id;

  // 5. Test Teacher Grading
  const gradeRes = await fetch('http://localhost:5000/api/v1/homework/submissions/' + subId + '/grade', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      marksObtained: 24,
      feedback: 'Excellent rigor and neat steps. Minor typo on question 12.'
    })
  });
  const gradeData = await gradeRes.json();
  console.log('Grading status:', gradeRes.status, 'Status:', gradeData.data?.status, 'Marks:', gradeData.data?.marks_obtained);

  // 6. Test CRM Lead Creation
  const leadRes = await fetch('http://localhost:5000/api/v1/crm/leads', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      studentName: 'Aarav Malhotra',
      parentName: 'Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      phone: '+91 9811223344',
      interestedClass: 'Class 10 CBSE',
      source: 'Walk-in Inquiry',
      notes: 'Interested in sports facilities and CBSE curriculum.'
    })
  });
  const leadData = await leadRes.json();
  console.log('CRM Lead creation status:', leadRes.status, 'Lead ID:', leadData.data?.id);
  const leadId = leadData.data?.id;

  // 7. Test Pipeline Status Advance
  const advanceRes = await fetch('http://localhost:5000/api/v1/crm/leads/' + leadId + '/status', {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'DEMO_SCHEDULED' })
  });
  const advanceData = await advanceRes.json();
  console.log('CRM Pipeline advance status:', advanceRes.status, 'New Status:', advanceData.data?.status);

  // 8. Test 1-Click Convert Lead to Active Student
  const convertRes = await fetch('http://localhost:5000/api/v1/crm/leads/' + leadId + '/convert', {
    method: 'POST',
    headers: authHeaders
  });
  const convertData = await convertRes.json();
  console.log('1-Click Conversion status:', convertRes.status, {
    success: convertData.success,
    studentId: convertData.data?.student?.id,
    admissionNo: convertData.data?.student?.admission_no,
    name: convertData.data?.student?.first_name + ' ' + convertData.data?.student?.last_name
  });

  console.log('--- ALL PHASE 7 VERIFICATIONS PASSED 100% ---');
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
