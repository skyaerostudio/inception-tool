# Business Requirements Document (BRD)

# Project Schedule Calendar Planning App

## 1. Document Information

| Item | Details |
|---|---|
| Product Name | Project Schedule Calendar Planning App |
| Version | 1.0 |
| Document Type | Business Requirements Document |
| Target User | Project Manager, Scrum Master, Delivery Manager, PMO |
| Main Purpose | Help users plan project activity schedules based on mandays while excluding company holidays and weekends |

---

## 2. Background

Project planning often requires calculating activity start dates and end dates based on mandays. Manual calculation becomes difficult when multiple activities run in parallel and company holidays need to be excluded.

This application is intended to provide a simple planning tool where users can input mandays for each project activity and instantly visualize the calculated start date and end date for each activity.

The application should support parallel activities, meaning each activity can have its own start date and duration without being forced to follow a strict sequence.

---

## 3. Business Objectives

The objectives of this application are:

1. Allow users to create a simple project schedule using mandays.
2. Automatically calculate end dates based on working days.
3. Exclude weekends and company holidays from manday calculation.
4. Support parallel project activities.
5. Provide a simple visual timeline showing start date and end date for each activity.
6. Help project teams quickly estimate schedule impact caused by holidays and non-working days.

---

## 4. Scope

### 4.1 In Scope

The application will include:

1. Project start date input.
2. Activity list with manday input.
3. Activity-level start date input.
4. Automatic end date calculation.
5. Company holiday exclusion.
6. Weekend exclusion.
7. Visual project timeline.
8. Editable activity mandays.
9. Reset or recalculate function.
10. Simple export or copy summary feature.

### 4.2 Out of Scope

The following are not included in the first version:

1. User login and authentication.
2. Role-based access control.
3. Resource allocation by person.
4. Cost calculation.
5. Dependency management between activities.
6. Integration with Jira, Confluence, Google Calendar, or Microsoft Project.
7. Advanced Gantt chart features such as drag-and-drop dependencies.
8. Critical path calculation.

---

## 5. Target Users

| User Type | Description |
|---|---|
| Project Manager | Plans project timeline and monitors schedule feasibility |
| Scrum Master | Coordinates project activities across squads |
| Delivery Manager | Reviews high-level delivery timeline |
| PMO | Validates project planning and reporting timeline |

---

## 6. Project Activities

The application should provide the following default activities:

1. Requirement Gathering
2. Development Core
3. Development Support
4. Development Middleware
5. SIT
6. UAT
7. Regression
8. Deployment
9. Post Implementation Review

Each activity can run independently and in parallel with other activities.

---

## 7. Holiday Calendar

The application must exclude the following company holidays from working-day calculation.

### 7.1 Company Holiday List Until End of 2026

| Date | Month | Year | Holiday Description |
|---:|---|---:|---|
| 1 | May | 2026 | Hari Buruh Internasional |
| 14 | May | 2026 | Kenaikan Yesus |
| 15 | May | 2026 | Kenaikan Yesus |
| 27 | May | 2026 | Idul Adha |
| 28 | May | 2026 | Idul Adha |
| 1 | June | 2026 | Pancasila |
| 16 | June | 2026 | Tahun Baru Islam |
| 17 | August | 2026 | Proklamasi |
| 25 | August | 2026 | Maulid Nabi |
| 24 | December | 2026 | Christmas |
| 25 | December | 2026 | Christmas |

### 7.2 Non-Working Days

The application should treat the following as non-working days:

1. Saturday
2. Sunday
3. Company holidays listed above

---

## 8. Business Rules

### 8.1 Manday Calculation Rule

1 manday equals 1 working day.

Working days exclude:

1. Saturdays
2. Sundays
3. Company holidays

Example:

If an activity starts on Monday and has 5 mandays, the activity should end on Friday, assuming there are no holidays within that period.

If a holiday falls within the activity period, the end date should be pushed forward accordingly.

---

### 8.2 Activity Start Date Rule

Each activity should have its own start date.

Because activities can run in parallel, the application should not automatically force Activity B to start after Activity A ends.

Example:

| Activity | Start Date | Mandays | End Date |
|---|---:|---:|---:|
| Requirement Gathering | 4 May 2026 | 5 | 8 May 2026 |
| Development Core | 6 May 2026 | 10 | 21 May 2026 |
| Development Support | 6 May 2026 | 8 | 19 May 2026 |

---

### 8.3 Start Date on Non-Working Day

If the user selects a start date that falls on a weekend or company holiday, the application should show a warning.

Recommended behavior:

- The application should automatically move the start date to the next available working day.
- The user should still be informed that the selected date was adjusted.

Example message:

> Selected start date is a non-working day. Start date has been adjusted to the next working day.

---

### 8.4 Manday Input Rule

Manday input should follow these rules:

1. Must be a positive number.
2. Minimum value is 1.
3. Decimal mandays are optional for future versions, but version 1 should use whole numbers only.
4. Empty manday input should be treated as 0 or invalid.

Recommended validation:

> Please input mandays as a whole number greater than 0.

---

### 8.5 Parallel Activity Rule

All activities can run in parallel. The calculation of one activity should not affect the calculation of another activity unless future dependency features are added.

---

## 9. Functional Requirements

### FR-001: Project Information Input

The user should be able to input basic project information.

| Field | Type | Required | Description |
|---|---|---|---|
| Project Name | Text | Yes | Name of the project |
| Project Start Date | Date | Yes | Default start date used for activities |
| Notes | Text Area | No | Optional project planning notes |

---

### FR-002: Default Activity List

The application should display the default activity list automatically.

Default activities:

1. Requirement Gathering
2. Development Core
3. Development Support
4. Development Middleware
5. SIT
6. UAT
7. Regression
8. Deployment
9. Post Implementation Review

---

### FR-003: Activity Input Table

The user should be able to input planning details for each activity.

| Field | Type | Required | Description |
|---|---|---|---|
| Activity Name | Text | Yes | Name of the project activity |
| Start Date | Date | Yes | Start date of the activity |
| Mandays | Number | Yes | Duration of the activity in working days |
| End Date | Auto-calculated | Yes | Calculated based on start date and mandays |
| Remarks | Text | No | Optional notes for the activity |

---

### FR-004: Auto End Date Calculation

The application should automatically calculate the end date when the user inputs or changes:

1. Activity start date
2. Mandays
3. Holiday configuration

The calculation should exclude weekends and listed company holidays.

---

### FR-005: Timeline Visualization

The application should display a simple timeline visualization showing each activity from start date to end date.

Recommended visualization:

- Horizontal timeline similar to a simple Gantt chart.
- Y-axis: Activity name.
- X-axis: Calendar dates.
- Activity bar: From start date to end date.

The visualization does not need advanced interaction in version 1.

---

### FR-006: Holiday Indicator

The application should visually indicate company holidays in the calendar timeline.

Recommended display:

- Highlight holiday dates in the timeline.
- Show holiday name on hover or as a small label.

---

### FR-007: Weekend Indicator

The application should visually indicate weekends in the calendar timeline.

Recommended display:

- Use subtle background shading for Saturday and Sunday.

---

### FR-008: Recalculate Schedule

The user should be able to recalculate the schedule after changing activity data.

The application may support either:

1. Auto-recalculate when inputs change, or
2. Manual recalculation button

Recommended version 1 behavior:

- Auto-recalculate by default.
- Also provide a “Recalculate” button for clarity.

---

### FR-009: Reset Planning Data

The user should be able to reset all activity inputs back to default.

Reset should clear:

1. Activity start dates
2. Mandays
3. Remarks
4. Calculated end dates

Default activity names should remain available.

---

### FR-010: Export or Copy Summary

The user should be able to export or copy the planning result.

Version 1 recommendation:

- Provide “Copy Summary” button.
- Format should be suitable for email, WhatsApp, or Confluence.

Example output:

```text
Project: Sample Project

1. Requirement Gathering: 4 May 2026 - 8 May 2026, 5 mandays
2. Development Core: 6 May 2026 - 21 May 2026, 10 mandays
3. SIT: 22 May 2026 - 29 May 2026, 5 mandays
```

---

## 10. Non-Functional Requirements

### 10.1 Usability

The application should be simple and easy to use without training.

Main users should be able to:

1. Input mandays quickly.
2. Understand the calculated dates.
3. View the overall project timeline clearly.

---

### 10.2 Performance

The application should calculate schedules instantly for at least 50 activities.

---

### 10.3 Compatibility

The application should be usable on:

1. Desktop browser
2. Laptop browser
3. Tablet browser

Mobile support is optional but should remain readable.

---

### 10.4 Data Persistence

Version 1 may use local browser storage.

Recommended behavior:

- Save current planning data automatically in local storage.
- Allow user to clear saved data.

Backend database is not required for version 1.

---

## 11. Recommended User Interface Layout

### 11.1 Page Structure

The application should have one main page with the following sections:

1. Header
2. Project Information Form
3. Activity Planning Table
4. Timeline Visualization
5. Holiday List Reference
6. Export / Copy Summary Button

---

### 11.2 Suggested Layout

```text
--------------------------------------------------
Project Schedule Calendar Planner
--------------------------------------------------
Project Name: [________________________]
Project Start Date: [Date Picker]
Notes: [_______________________________]

--------------------------------------------------
Activity Planning
--------------------------------------------------
| Activity | Start Date | Mandays | End Date | Remarks |
|----------|------------|---------|----------|---------|
| Requirement Gathering | [date] | [number] | auto | [text] |
| Development Core | [date] | [number] | auto | [text] |
| Development Support | [date] | [number] | auto | [text] |
| Development Middleware | [date] | [number] | auto | [text] |
| SIT | [date] | [number] | auto | [text] |
| UAT | [date] | [number] | auto | [text] |
| Regression | [date] | [number] | auto | [text] |
| Deployment | [date] | [number] | auto | [text] |
| Post Implementation Review | [date] | [number] | auto | [text] |

[Recalculate] [Reset] [Copy Summary]

--------------------------------------------------
Timeline Visualization
--------------------------------------------------
Requirement Gathering      █████
Development Core              ██████████
Development Support           ████████
Development Middleware        ███████
SIT                                      █████
UAT                                            █████
Regression                                           ███
Deployment                                               █
Post Implementation Review                                ██

--------------------------------------------------
Company Holidays
--------------------------------------------------
1 May 2026 - Hari Buruh Internasional
14 May 2026 - Kenaikan Yesus
15 May 2026 - Kenaikan Yesus
...
```

---

## 12. Calculation Logic

### 12.1 Working Day Definition

A date is considered a working day if:

1. The date is not Saturday.
2. The date is not Sunday.
3. The date is not included in the company holiday list.

---

### 12.2 End Date Calculation Logic

Input:

1. Start date
2. Mandays
3. Holiday list

Output:

1. End date

Logic:

```text
1. Take selected start date.
2. If start date is not a working day, move to the next working day.
3. Count the start date as day 1 if it is a working day.
4. Continue moving day by day.
5. Only count working days.
6. Stop when counted working days equals mandays.
7. Return the final counted date as the end date.
```

Example:

```text
Start Date: 11 May 2026
Mandays: 5
Holiday: 14 May 2026 and 15 May 2026

Working day count:
11 May = Day 1
12 May = Day 2
13 May = Day 3
14 May = Holiday, skipped
15 May = Holiday, skipped
16 May = Saturday, skipped
17 May = Sunday, skipped
18 May = Day 4
19 May = Day 5

End Date = 19 May 2026
```

---

## 13. Data Model

### 13.1 Project Object

```json
{
  "projectName": "Sample Project",
  "projectStartDate": "2026-05-04",
  "notes": "Optional notes"
}
```

---

### 13.2 Activity Object

```json
{
  "activityName": "Requirement Gathering",
  "startDate": "2026-05-04",
  "mandays": 5,
  "endDate": "2026-05-08",
  "remarks": "Optional remarks"
}
```

---

### 13.3 Holiday Object

```json
{
  "date": "2026-05-01",
  "description": "Hari Buruh Internasional"
}
```

---

## 14. Validation Requirements

| Scenario | Expected Behavior |
|---|---|
| Mandays is empty | Show validation message |
| Mandays is 0 | Show validation message |
| Mandays is negative | Show validation message |
| Start date is empty | Show validation message |
| Start date is weekend | Adjust to next working day and show warning |
| Start date is company holiday | Adjust to next working day and show warning |
| Activity has valid start date and mandays | Calculate end date automatically |

---

## 15. Acceptance Criteria

### AC-001: Activity End Date Calculation

Given the user inputs a valid start date and mandays, when the schedule is calculated, then the application should display the correct end date excluding weekends and company holidays.

---

### AC-002: Holiday Exclusion

Given an activity period contains a company holiday, when the end date is calculated, then the holiday should not be counted as a working day.

---

### AC-003: Weekend Exclusion

Given an activity period contains Saturday or Sunday, when the end date is calculated, then Saturday and Sunday should not be counted as working days.

---

### AC-004: Parallel Activities

Given multiple activities have overlapping dates, when the timeline is displayed, then all activities should be shown independently without blocking each other.

---

### AC-005: Timeline Visualization

Given activities have calculated start and end dates, when the user views the timeline, then each activity should be represented as a horizontal bar from start date to end date.

---

### AC-006: Copy Summary

Given activities have calculated dates, when the user clicks Copy Summary, then the application should copy a readable project schedule summary to the clipboard.

---

## 16. Future Enhancements

Potential future improvements:

1. Activity dependency support.
2. Drag-and-drop timeline adjustment.
3. Resource assignment per activity.
4. Export to Excel.
5. Export to PDF.
6. Import holiday calendar from CSV.
7. Save multiple project plans.
8. Integration with Google Calendar.
9. Integration with Jira or Confluence.
10. Baseline vs actual schedule tracking.

---

## 17. Summary

This application will provide a simple but useful project schedule planning tool. The main value is automatic date calculation based on mandays while excluding weekends and company holidays. Since project activities can run in parallel, each activity should be calculated independently and visualized clearly in a simple timeline.

The first version should prioritize simplicity, speed, and clarity over advanced project management features.
