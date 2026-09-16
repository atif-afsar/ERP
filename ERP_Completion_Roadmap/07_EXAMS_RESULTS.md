# Phase 7 — Exams and Results

## Objective

Turn the existing exams/results UI into a reliable academic workflow.

## Workflow

```text
Create exam
 ↓
Add subjects
 ↓
Assign classes/students
 ↓
Enter marks
 ↓
Validate marks
 ↓
Calculate totals/grades
 ↓
Review/approve
 ↓
Publish
 ↓
Student/parent view
 ↓
Report card
```

## Validation

- marks cannot exceed maximum
- student must belong to permitted tenant/class
- subject must belong to exam
- duplicate result entries prevented
- published results require controlled editing

## Result states

Suggested:

```text
draft
submitted
approved
published
```

## Audit

Record who:

- entered marks
- changed marks
- approved results
- published results

## Report cards

Generate a consistent PDF/report view from real data.

## Exit criteria

A complete exam can be created, marks entered, approved, published and viewed by an authorized student/parent.
