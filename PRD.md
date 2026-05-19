# Product Requirement Document (PRD)
## Sound Box Management & Operational Logistics Dashboard
**Version 1.0** | **Prepared by: Operations & Product Team** | **Status: Final**

---

## 1. Document Overview

### 1.1 Purpose
This document defines the functional and product requirements for a centralized **Sound Box Management & Operational Logistics Dashboard**. By pivoting from a generic database explorer to a structured **hierarchical pivot drill-down engine**, the platform enables operations managers and bank partners to instantly identify bottlenecks, monitor seasonal trends, and export structured datasets for physical dispatch alignment. The system provides end-to-end visibility across the complete operational pipeline — from initial indent to final delivery and activation, with a special emphasis on dynamic filtering and advanced visual reporting.

### 1.2 Scope
The scope of this document covers:
1. A high-performance, enterprise-grade logistical tracking and operational intelligence platform for Sound Box order processing, deployment, merchant conversion, and technical activation.
2. An **Interactive KPI Summary Panel** across 7 core operational milestones, fully integrated with dynamic column selection, offering per-metric bank-wise downloadable breakdowns.
3. A **Glassmorphic Sticky Control Panel** offering multi-select bank and year filters, a dynamic column-wise selector, time-range presets (Today, Yesterday, Last 7 Days, Last Month, Last 3/6 Months), inline From/To calendar date pickers with native click-popup focus, and a global reset action.
4. A **Multi-Level Operational Drilldown (Tree Grid)** supporting `Bank ➔ Year ➔ Month ➔ Date` hierarchy with real-time dynamic column aggregation.
5. An **Excel Export with Native Outline Grouping** leveraging Microsoft Office namespace attributes (`mso-outline-level`) to generate collapsible spreadsheet rows dynamically matching the active column selection.
6. A **Dual Analytical Chart Panel** consisting of:
    * **Cumulative Indent Progression Chart**: Renders a cricket worm-style responsive Recharts Line Chart with bank-specific curves.
    * **Bank-wise Stacked Metric Distribution Chart**: Renders a Recharts stacked Bar Chart showing live metric distribution per bank Institution, matching only the checked visible columns.

---

## 2. Executive Summary & Objective
The **Sound Box Management Dashboard** is a high-performance, enterprise-grade logistical tracking and operational intelligence platform. Its primary goal is to provide end-to-end visibility into the lifecycle of Sound Box order processing, deployment, merchant conversion, and technical activation.

By pivoting from a generic database explorer to a structured **hierarchical pivot drill-down engine**, the platform enables operations managers and bank partners to instantly identify bottlenecks, monitor seasonal trends, and export structured datasets for physical dispatch alignment.

---

## 3. Product Objectives & Target Audience

### 3.1 Objectives
1. **Pipeline Synthesis**: Synthesize a complex operational pipeline into a single, high-fidelity real-time dashboard, completely stripping away obsolete columns (e.g., Merchant Accept) to focus entirely on actionable outcomes.
2. **Multi-Dimensional Drill-Down**: Enable multi-dimensional drill-downs across hierarchical levels: `Bank ➔ Year ➔ Month ➔ Date`.
3. **Dynamic Visual Flexibility**: Empower the user to dynamically add/remove columns, instantly reshaping the KPI summary cards, tabular data, Excel exports, and stacked graphs.
4. **Premium Aesthetics**: Maintain pixel-perfect, glassmorphic UI aesthetics with custom indigo-cyan palettes, harmonized HSL colors, responsive layouts, and clean typography.
5. **Spreadsheet Outline Compliance**: Provide direct, outline-compliant Excel downloads supporting native sheet-level nesting and grouping.

### 3.2 Target Audience

| Role | Primary Use Cases |
| :--- | :--- |
| **Operations Leads** | Track logistics pipelines, pickup schedules, courier performance, and RTO (Return to Origin) rates. |
| **Bank Partners** | Verify bank-specific indent completion, merchant acceptance logs, and installation compliance. |

---

## 4. Core Functional Requirements

### 4.1 Interactive KPI Summary Panel
High-impact cards highlighting critical indicators across the core operational milestones.

#### 4.1.1 Milestones Tracked

| # | Milestone | Description |
| :--- | :--- | :--- |
| **1** | **Indent Count** | Total initial requests received. |
| **2** | **Merchant Deny** | Denials logged (highlighted in soft high-contrast red). |
| **3** | **Devices Mapped** | Successful device serialization mapping in backend logs. |
| **4** | **Pickup Count** | Orders handed over to delivery partners. |
| **5** | **In Transit** | Active logistics dispatch. |
| **6** | **Delivery Count** | Orders confirmed delivered at merchant locations. |
| **7** | **RTO Count** | Delivery failures resulting in returns (highlighted in soft high-contrast red). |

* **Interactive Download**: Hovering or clicking on each KPI card exposes a download trigger. Clicking it exports a specific, bank-wise breakdown of that individual metric.
* **Filter Compliance**: The KPI summary row dynamically adjusts to display only the metrics selected by the active column-wise filter.

### 4.2 Glassmorphic Sticky Control Panel
A sticky, blur-filtered control panel containing global dashboard configuration. Remains anchored at the top of the viewport during vertical scrolling, utilizing a transparent backdrop blur (`backdrop-filter: blur(12px)`).

| Control | Functional Specification |
| :--- | :--- |
| **Multi-Select Bank Filter** | Dropdown allowing users to isolate metrics to specific bank institutions (e.g., SBI, HDFC, ICICI, etc.). |
| **Multi-Select Year Filter** | Dropdown dynamically populated from database years. |
| **Select Columns (Filter)** | Dropdown allowing users to check/uncheck visible metrics. Unchecking instantly hides columns in the Grid, KPI summary, Excel export, and Stacked Bar Graph. |
| **Time Range Selector** | Dropdown supporting presets: `All Time`, `Today`, `Yesterday`, `Last 7 Days`, `Last Month`, `Last 3 Months`, `Last 6 Months`, and `Custom Range`. |
| **Custom Date Pickers** | Renders inline **From Date** and **To Date** calendar inputs when `Custom Range` is selected. Tapping anywhere inside the input text fields calls `showPicker()` to instantly pop up the native calendar dialogue. |
| **Reset Action** | Instantly wipes all applied bank, year, column, and date filters, returning the dashboard to the default global aggregate state. |
| **Sticky State** | Remains anchored at the top of the viewport during vertical scrolling via transparent backdrop blur. |

### 4.3 Multi-Level Operational Drilldown (Tree Grid)
A collapsible tree grid grouping historical data in a parent-child structure.

| Feature | Specification |
| :--- | :--- |
| **Hierarchical Order** | `Bank ➔ Year ➔ Month ➔ Specific Date` |
| **Interactive Collapsibility** | Chevron toggles expand or contract sub-levels without triggering page refreshes. |
| **Real-time Column Aggregation** | Every level (month or year row) automatically rolls up and sums the exact values of its child nodes across all active metrics. $\text{Parent Value} = \sum \text{Child Values}$. |
| **Visual Indentation & Left Borders** | Left borders colored by nesting depth: Level 0 (Indigo), Level 1 (Slate), Level 2 (Silver) to ensure excellent structural legibility. |
| **Table Header** | Sticky, high-contrast dark header with sortable columns dynamically adjusting to the active column selection. |

### 4.4 Excel Export with Native Outline Grouping
Downloader yielding an Excel-compatible file that supports collapsible spreadsheet rows.

| Spec | Detail |
| :--- | :--- |
| **Format** | Generates a standard, MIME-typed Excel XML sheet. |
| **Dynamic Columns** | Exports only the active visible columns selected by the user. |
| **Nesting Integration** | Leverages Microsoft Office namespace attributes (`mso-outline-level`) to feed hierarchy levels directly to Excel. |
| **UX Outcome** | When opened in Microsoft Excel or Google Sheets, rows are automatically pre-grouped, allowing operations teams to expand/collapse months and banks directly within the spreadsheet. |

### 4.5 Dual Analytical Chart Panel
Comprehensive chronological and structural visual intelligence cards.

| Spec | Detail |
| :--- | :--- |
| **Cumulative Indent Line Chart** | Displays a responsive Recharts Line Chart with separate bank-specific curves and soft drop shadow filters showing cumulative indent growth over time. |
| **Stacked Metric Bar Chart** | Displays a responsive Recharts stacked Bar Chart showing bank-wise metric distribution. The chart dynamically maps and stacks only the active selected columns. |

---

## 5. Technical Architecture & Database Design

### 5.1 Core Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (v19), TypeScript, Redux Toolkit (State Management), Material UI (Component System), Recharts (Analytics Engine). |
| **Backend** | Node.js, Express, TypeScript, Prisma (ORM). |
| **Database** | SQLite (Local development) / PostgreSQL (Production). |
| **Deployment** | Vercel Services — Monorepo architecture with custom path mapping. Frontend: framework: `vite` mapped to `/`. Backend: serverless configuration mapped to `/_/backend`. |

### 5.2 Database Schema Model (Prisma Entity-Relationship)
The following entities define the core data model. The `INDENT` entity is the central record linking all other entities.

| Entity | Key Fields | Relationships / Notes |
| :--- | :--- | :--- |
| **USER** | `id`, `email`, `password`, `name`, `role` | Authentication and role-based access control. |
| **BANK** | `id`, `name` | One bank places many indents. |
| **COURIER_PARTNER** | `id`, `name` | One courier partner ships many indents. |
| **MERCHANT** | `id`, `name`, `mobile` | One merchant owns one indent. |
| **INDENT** | `id`, `merchantId` (FK), `bankId` (FK), `deliveryType`, `indentDate`, `merchantAcceptDeny`, `mappingStatus`, `pickupStatus`, `deliveryStatus`, `installationStatus`, `activationStatus`, `courierPartnerId` (FK), `agentName`, `remarks`, `currentStatus` | Central entity; links to Bank, Merchant, Courier Partner, Calling Log, Mapping Log, and Delivery Log. |
| **CALLING_LOG** | Tracks calling events per indent. | Many calling logs per indent. |
| **MAPPING_LOG** | Tracks device serialization mapping. | Many mapping logs per indent. |
| **DELIVERY_LOG** | Tracks dispatch and delivery events. | Many delivery logs per indent. |

---

## 6. Non-Functional Requirements & Design Aesthetics

### 6.1 Visual Excellence

| ID | Category | Requirement |
| :--- | :--- | :--- |
| **VIS-01** | **Color Palette** | Strictly enforce custom HSL colors: `#4f46e5` (Indigo) for main accents, `#06b6d4` (Cyan/Teal) for auxiliary operations, `#10b981` (Emerald) for active status. Zero plain browser-default colors (no default red/blue/green). |
| **VIS-02** | **UI Aesthetics** | Glassmorphic filtering (`backdrop-filter`), clean card shadows, and modern typography using Google Inter & Outfit fonts. |

### 6.2 Performance & Reliability

| ID | Category | Requirement |
| :--- | :--- | :--- |
| **NFR-01** | **Transactional Integrity** | Complex operations (e.g., simultaneous Merchant creation and Indent registration) must run inside database transactions (`prisma.$transaction`) to avoid orphaned records. |
| **NFR-02** | **Query Optimization** | The `/api/dashboard/data` endpoint dynamically calculates aggregates directly on the SQL query where possible, minimizing payload sizes within Vercel Serverless bounds. |

---

## 7. Functional Requirements

### FR-01: KPI Summary Panel
1. The system shall display dynamically rendered KPI cards corresponding to active operational milestones: Indent Count, Merchant Deny, Devices Mapped, Pickup Count, In Transit, Delivery Count, and RTO Count.
2. Each KPI card shall expose a download trigger on hover or click, exporting a bank-wise breakdown of that individual metric.
3. Merchant Deny and RTO Count KPI cards shall be rendered with high-contrast red highlighting.
4. The panel shall dynamically add or remove cards matching the user's active columns selection.

### FR-02: Sticky Control Panel
5. The control panel shall remain anchored at the top of the viewport during vertical scrolling, using `backdrop-filter: blur(12px)`.
6. The system shall provide a multi-select bank filter dropdown for isolating metrics to one or more bank institutions.
7. The system shall provide a multi-select year filter dropdown dynamically populated from the years present in the database.
8. The system shall provide a dynamic column selector allowing users to check/uncheck visible metrics.
9. The system shall support date-range presets: Today, Yesterday, Last 7 Days, Last Month, Last 3 Months, and Last 6 Months.
10. The system shall support custom calendar date range inputs (From Date and To Date) rendering inline.
11. Tapping anywhere inside the date inputs shall programmatically trigger `showPicker()` to display the calendar.
12. A Reset action shall instantly wipe all applied filter parameters and return the dashboard to the default global aggregate state.

### FR-03: Multi-Level Operational Drilldown
13. The system shall render a collapsible tree grid with the hierarchy: `Bank ➔ Year ➔ Month ➔ Specific Date`.
14. Chevron toggles shall expand or collapse sub-levels without triggering a page refresh.
15. Every parent level (year row, month row) shall automatically aggregate and display the sum of all child node values across all active metrics.
16. Left borders shall be color-coded by nesting depth: Level 0 (Indigo), Level 1 (Slate), Level 2 (Silver).
17. The table header shall be sticky and high-contrast dark, with sortable columns dynamically adjusting to the active column selection.

### FR-04: Excel Export with Outline Grouping
18. The system shall generate a standard MIME-typed Excel XML sheet on user download request.
19. The export shall dynamically format and include only the active visible columns selected by the user.
20. The export shall leverage Microsoft Office namespace attributes (`mso-outline-level`) to represent the dashboard hierarchy levels natively in Excel.
21. When opened in Microsoft Excel or Google Sheets, rows shall be automatically pre-grouped, allowing operations teams to expand or collapse months and banks directly in the spreadsheet.

### FR-05: Cumulative Indent Progression Chart
22. The system shall render a responsive Recharts Line Chart displaying cumulative indent growth over time.
23. The chart shall display separate bank-specific curves with soft drop shadow filters.
24. The chart shall enable banks to compare seasonal slope acceleration and run-rate projections.

### FR-06: Stacked Metric Distribution Chart
25. The system shall render a responsive Recharts stacked Bar Chart showing bank-wise metric distribution.
26. The chart's bars shall dynamically stack only the active selected columns.

---

## 8. Assumptions & Constraints

### 8.1 Assumptions
1. All operational data is available via the connected database and is queryable through the `/api/dashboard/data` endpoint.
2. `merchantUpiId` (VPA) is unique per merchant and serves as the join key across all report types where applicable.
3. The database is hosted on PostgreSQL in production; SQLite is used for local development only.
4. Frontend deployment is on Vercel using the Vite framework mapped to the root path.
5. Backend API is deployed as a Vercel Serverless function mapped to `/_/backend`.

### 8.2 Constraints
1. No real-time courier API integration is included in this scope; delivery status is derived from the data stored in the database only.
2. The system does not modify source reports; it only reads from the database and writes to the dashboard views.
3. Redux Toolkit is the sole state management library; no other state libraries are permitted.
4. The Recharts library is the designated analytics engine; other charting libraries shall not be introduced.

— End of Document —
