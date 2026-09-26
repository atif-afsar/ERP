# END-TO-END (E2E) TEST SUITE PLAN
## Module 1: Onboarding & Auth
- [ ] **TC-01:** Super Admin creates a new Tenant $\rightarrow$ Verify Tenant record exists in DB.
- [ ] **TC-02:** User signs up for a specific Tenant $\rightarrow$ Verify JWT contains correct `tenantId`.
- [ ] **TC-03:** User attempts to access another Tenant's API via `X-Tenant-ID` $\rightarrow$ Verify `403 Forbidden`.

## Module 2: Academic & Student Mgmt
- [ ] **TC-04:** Create Class $\rightarrow$ Create Section $\rightarrow$ Enroll Student $\rightarrow$ Verify Student appears in Class List.
- [ ] **TC-05:** Change Tenant Type from 'School' to 'Coaching' $\rightarrow$ Verify 'Class' becomes 'Batch' in UI.

## Module 3: Financials (Critical Path)
- [ ] **TC-06:** Create Fee Template $\rightarrow$ Assign to Class $\rightarrow$ Verify Student Invoice is generated.
- [ ] **TC-07:** Process Payment $\rightarrow$ Submit same request twice with same `Idempotency-Key` $\rightarrow$ Verify only one payment is recorded.
- [ ] **TC-08:** Apply 10% Scholarship $\rightarrow$ Process Payment $\rightarrow$ Verify remaining balance is correct.

## Module 4: Attendance & Performance
- [ ] **TC-09:** Mark Student 'Absent' $\rightarrow$ Verify Parent Portal shows updated attendance.
- [ ] **TC-10:** Enter Marks for Batch $\rightarrow$ Compute Rank $\rightarrow$ Verify Rank 1 is correctly assigned to highest score.

## Module 5: System Stability
- [ ] **TC-11:** Simulate Network Failure during payment $\rightarrow$ Check for data corruption/partial writes.
- [ ] **TC-12:** Load test 100 simultaneous requests to `/auth/me` $\rightarrow$ Verify response time < 200ms.
