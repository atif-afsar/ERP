# Mock and Demo Data Usage

## Phase 1 policy

The frontend storage adapter now uses memory only. It never reads or writes the existing browser business-data keys. Existing records remain available in localStorage for a later export/migration. Public self-signup, demo identity switching, demo role switching, and the demo-data reset control are disabled.

All modules below are read-only in the application shell until their backend write paths and frontend services are migrated. The UI displays an explicit read-only notice and blocks mutation controls.

## Screens still backed wholly or partly by seed/mock data

| Screen | Current source |
| --- | --- |
| Dashboard | storage seed data for student, staff, fee, attendance, notice and timetable summaries |
| Students | partial backend list plus storage seed data for guardians, enrollment, documents, fees, exams and attendance |
| Staff and payroll | storage seed data |
| Academics | storage seed classes, courses, batches, students and staff |
| Attendance | storage seed rosters and attendance records |
| Fees | storage seed ledgers, payments and fee structures |
| Finance | storage seed expenses, vendors, bills, accounts, budgets and petty cash |
| Inventory | storage seed inventory, warehouses, movements and assets |
| Library | storage seed titles, copies, members and circulation |
| Transport | storage seed vehicles, drivers, routes, trips, fuel and enrollments |
| Hostel | storage seed hostels, rooms, beds, allocations, attendance, passes and complaints |
| Mess | storage seed plans, menus, subscriptions, consumption and feedback |
| Health | storage seed profiles, allergies, clinics, visits, screening and vaccination |
| Exams and results | storage seed exams, grade scales and results |
| Timetable | storage seed timetable, class/batch and staff data |
| Homework | storage seed homework, class/batch and staff data |
| Communication | storage seed notices and notifications |
| CRM | storage seed leads |
| Reports | aggregates from storage seed business records |
| Settings and role matrix | storage seed audit, session and invitation data |
| Super-admin dashboards | storage seed tenant, student and audit data |
| AI assistant | built-in campus documents and storage seed student/fee context; custom uploads are memory-only |

API Explorer and Schema Explorer are developer/reference screens. The public landing page does not use ERP business records.

## Migration boundary

Read-only presentation of seed data remains to avoid removing screens during Phase 1. These screens must not be treated as authoritative. Each can be made writable only after its backend endpoints, database constraints, tenant authorization, validation, and frontend API integration are completed.
