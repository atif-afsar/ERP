# UI / UX Polish Backlog

**Audit Date:** 2026-10-06  
**Audited Baseline:** EduNexus ERP v1.0.0-RC  
**Purpose:** Non-functional usability, cosmetic alignment, micro-interactions, and visual consistency backlog for post-V1 release polish.  

---

## 1. Polish & Usability Items Catalog

| Item ID | Category | Module | Screen | Element | Description & Human Experience Observation | Severity / Priority |
|---|---|---|---|---|---|---|
| **UX-POLISH-001** | Micro-Interaction | Authentication | Login View (`#/login`) | Password Input Field | **Missing Password Visibility Toggle:** The password input on the primary sign-in form does not feature a reveal/hide password icon (`Eye` / `EyeOff`). Users typing complex passwords cannot visually verify their input before submission. | Low (Cosmetic / Usability) |
| **UX-POLISH-002** | Table Formatting | Students | Student Directory (`#/app/students`) | Table Cell Truncation | **Email Address Truncation on 1366px Laptops:** In the student directory table at standard 1366×768 resolution, long institutional email addresses (e.g. `student-4425b960@rc.example.test`) truncate with ellipsis. While table scrolling works, adding an explicit hover tooltip showing the full address would enhance readability. | Low (Usability) |
| **UX-POLISH-003** | Visual Consistency | Fees & Master Data | Tab Navigation Bars | Active Tab Indicator | **Subtle Active Tab Indicator:** Active tabs across module workbenches (e.g. Profile, Academic Years, Classes) use text color highlighting (`text-emerald-700`) without an animated bottom border line. Adding a 2px bottom accent bar would provide stronger spatial hierarchy. | Low (Cosmetic) |
| **UX-POLISH-004** | Accessibility / Contrast | Navigation Shell | Main Sidebar | Section Group Headers | **Low Contrast Section Headings:** Group header labels in the sidebar (e.g. `OVERVIEW`, `ACADEMICS`, `FINANCE & OPS`) use small muted slate text (`text-[10px] text-slate-400 font-bold uppercase`). Increasing contrast slightly would improve scanning ease in low-light environments. | Low (Accessibility) |
| **UX-POLISH-005** | Micro-Interaction | Parent Portal | Dues Overview (`#/app/fees`) | Child Switcher Dropdown | **Child Avatar Accent:** The multi-child switcher dropdown on the Parent Portal displays student names and admission numbers cleanly. Adding a small initial-badge or avatar indicator next to each child's name would make switching between siblings even more intuitive. | Low (Cosmetic) |

---

## 2. Recommendations for Post-V1 UI Polish Sprint

1. **Password Field Utility:** Introduce a reusable password input component with built-in show/hide toggle across login, profile password updates, and user creation drawers.
2. **Table Tooltip Wrappers:** Ensure all table cells with text truncation (`truncate`, `text-ellipsis`) automatically display the full string in a native `title="..."` attribute or Tailwind tooltip.
3. **Sidebar Typography:** Increase font weight and contrast of uppercase group labels by upgrading from `text-slate-400` to `text-slate-500` with tracking enhancement (`tracking-wider`).
