# 62 — PUBLIC LANDING PAGE & MARKETING EXPERIENCE

**Status:** Implementation Specification  
**Goal:** Make the public website the first experience. No ERP dashboard or internal role controls should appear before authentication.

## Route Boundary

```text
PUBLIC
/
 /features
 /solutions/school
 /solutions/coaching-centre
 /pricing
 /contact
 /login
 /signup
 /forgot-password
 /privacy
 /terms

PRIVATE
/app/*
/portal/*
/super-admin/*
```

## Landing Page

Structure:

```text
Header
Hero
Core benefits
School solution
Coaching-centre solution
Key features
How it works
Security / reliability
Pricing CTA
FAQ
Final CTA
Footer
```

### Header

```text
EduNexus
Features
For Schools
For Coaching Centres
Pricing

[Sign In] [Get Started]
```

Do NOT show Super Admin, Principal, Teacher, Accountant, Staff, Parent or Student buttons publicly.

### Hero

Use clear product language:

> Run your school or coaching centre from one simple platform.

Supporting copy:

> Admissions, students, attendance, fees, exams, communication, staff and more — connected in one modern ERP.

Actions:

```text
[Get Started] [See How It Works]
```

## Visual Direction

Use the approved white + green system:

- White / very light background
- Green primary actions
- Dark readable text
- Subtle gray borders
- Minimal shadows
- No neon gradients
- No glow effects
- No futuristic AI-dashboard styling

## School Positioning

Show:

- Students
- Classes and sections
- Attendance
- Admissions
- Fees
- Exams
- Timetable
- Homework
- Parent communication
- Staff
- Optional library, transport and hostel

## Coaching-Centre Positioning

Show:

- Learners
- Batches
- Attendance
- Admissions
- Fees/installments
- Tests
- Results/rank comparison
- Faculty
- Communication

## How It Works

```text
Create organization
        ↓
Configure institution
        ↓
Invite team
        ↓
Add students / learners
        ↓
Run your institution
```

## Important Rule

The public page must never fetch or render tenant ERP data.

It must not expose:

- Internal tenant IDs
- Database IDs
- Supabase service keys
- Private dashboards
- Internal navigation
- Super Admin routes

## Responsive Requirements

Test:

```text
320px
375px
390px
414px
768px
1024px
1280px
1440px
1920px
```

No horizontal overflow.

## Acceptance Criteria

- Landing page is the first experience.
- It is usable without authentication.
- No internal role selector is visible.
- Sign In and Get Started lead to the correct auth flow.
- Mobile layout is polished.
- Public pages contain no private tenant data.
