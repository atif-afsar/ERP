# 65 — SAAS SELF-ONBOARDING & WORKSPACE SETUP

**Status:** Implementation Specification  
**Goal:** Give a new organization a polished guided setup instead of dropping it into a complicated ERP dashboard.

The project context defines self-onboarding, client-specific configuration, feature toggles and custom labels as core SaaS capabilities.

## Journey

```text
Signup
 ↓
Verify account
 ↓
Create organization
 ↓
Choose institution type
 ↓
Configure basics
 ↓
Create initial structure
 ↓
Invite team
 ↓
Finish setup
 ↓
Dashboard
```

## Step 1 — Institution Type

```text
What are you managing?

○ School
○ Coaching Centre
```

This determines terminology and default configuration.

## Step 2 — Organization

Collect:

```text
Organization name
Display name
Phone
Email
Website (optional)
Address
City
State
PIN code
Logo (optional)
```

## Step 3 — Basic Configuration

School defaults:

```text
Academic Year
Classes
Sections
Attendance
Exams
Fees
```

Coaching defaults:

```text
Courses
Batches
Subjects
Test series
Fee plans
Installments
```

Do not force advanced configuration during first setup.

## Step 4 — Admin Profile

```text
Name
Phone
Designation
Profile photo (optional)
```

The backend creates the initial organization membership. Frontend role selection is not authoritative.

## Step 5 — Branch

Ask:

```text
Does your organization have multiple branches?

○ No, one branch
○ Yes, multiple branches
```

Create the first branch where applicable.

## Step 6 — Invite Team

```text
Invite your team

Email / Mobile
Role template
[Send Invitation]
```

Templates may include:

```text
Administrator
Principal
Teacher / Faculty
Accountant
Staff
```

These are controlled assignment templates, not public self-registration roles.

## Step 7 — Setup Checklist

```text
Setup progress

✓ Organization profile
✓ Admin profile
✓ Branch

○ Academic structure
○ Fee structure
○ Staff
○ Students
○ Communication settings

[Continue Setup]
```

## New Workspace Dashboard

Never populate a new workspace with fake business metrics.

Use:

```text
Welcome to EduNexus

Your workspace is ready.

Let's set up your institution.

[Complete Setup]
```

## First-Data Wizard

School:

```text
Add first class
Add first teacher
Add first student
Configure fee
```

Coaching:

```text
Create first course
Create first batch
Add faculty
Add learners
Configure fee plan
```

## Resume

If the user leaves onboarding:

```text
Login
 ↓
Detect incomplete onboarding
 ↓
Resume at last incomplete step
```

## Completion

When required setup is complete:

```text
onboarding_completed = true
```

Then:

```text
/app/dashboard
```

## Data Safety

Do not trust client-controlled values for:

```text
tenant_id
role
permissions
is_super_admin
```

The backend must determine organization membership and authorization.

## Mobile

Use one step per screen:

```text
Progress
Question
Inputs
Continue
```

Avoid complex desktop multi-column forms.

## Acceptance Criteria

- New visitor starts at landing page.
- Signup creates a controlled onboarding process.
- Institution type changes defaults/labels.
- First organization creator receives the correct initial membership.
- Role questions never grant privileges.
- No fake statistics are shown.
- Onboarding progress persists.
- Team members use invitations.
- Super Admin remains completely separate.
- Mobile onboarding is fully usable.
