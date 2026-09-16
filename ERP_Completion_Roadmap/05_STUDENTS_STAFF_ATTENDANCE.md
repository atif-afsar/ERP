# Phase 5 — Students, Staff and Attendance

## Objective

Make the first major ERP vertical fully production-ready.

## Student workflow

- create student
- admission number
- guardian linking
- class/section/batch
- contact details
- status
- documents/photos if supported
- edit
- archive
- search/filter
- import/export where already designed

## Staff workflow

- create staff
- role/designation
- department
- contact
- employment status
- documents where required
- edit/archive

## Attendance workflow

Teacher selects:

```text
date → class/batch → subject/session → students
```

Marks:

- present
- absent
- late
- excused if supported

Prevent duplicate attendance for the same student/session.

## Reporting

Provide:

- daily attendance
- student attendance percentage
- class attendance
- absent list
- date-range reports

## Parent/student view

Only show permitted records.

## Acceptance test

A real test tenant can:

1. create a student;
2. create/link guardian;
3. assign class;
4. create teacher;
5. mark attendance;
6. refresh browser;
7. log in from another account;
8. see the correct attendance;
9. verify unauthorized users cannot access it.

## Exit criteria

Students + staff + attendance work without localStorage dependency.
