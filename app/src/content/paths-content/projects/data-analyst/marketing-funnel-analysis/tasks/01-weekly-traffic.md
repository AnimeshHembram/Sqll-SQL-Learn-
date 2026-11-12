---
id: mfa-01-weekly-traffic
title: Weekly traffic
order: 1
difficulty: beginner
topic: Traffic analysis
summary: Summarise sessions, unique visitors and the mobile share for each week of the quarter.
module: traffic-and-tracking
duration: 15
dataset: vidya-loop
tables:
  - sessions
orderMatters: true
checkColumnNames: true
objectives:
  - Group dates into weeks with date modifiers
  - Tell sessions and visitors apart
prerequisites:
  - date() modifiers
  - COUNT(DISTINCT)
---

## Task

Start with the size and shape of the traffic. For each week (`week_start`, the **Monday** of the week, as a date), return `sessions`, `visitors` (distinct visitors) and `mobile_pct` (the share of sessions on mobile, one decimal). Sort by `week_start`.

Tip: SQLite's `date(session_date, 'weekday 0', '-6 days')` moves a date to the following Sunday (or keeps it if it is a Sunday) and then back six days, which is the Monday of that week.

## Starter query

```sql
SELECT session_date, COUNT(*) AS sessions
FROM sessions
GROUP BY session_date
ORDER BY session_date
LIMIT 14;
```

## Hints

1. Group by the week, not the day: compute `date(session_date, 'weekday 0', '-6 days') AS week_start` and group by it.
2. Sessions and visitors are different: a visitor can come back several times in a week, so use `COUNT(DISTINCT visitor_id)` for visitors.
3. `SUM(device = 'mobile')` counts mobile sessions; divide by `COUNT(*)` with `100.0 *` in front.

## Solution

```sql
SELECT date(session_date, 'weekday 0', '-6 days') AS week_start,
       COUNT(*) AS sessions,
       COUNT(DISTINCT visitor_id) AS visitors,
       ROUND(100.0 * SUM(device = 'mobile') / COUNT(*), 1) AS mobile_pct
FROM sessions
GROUP BY week_start
ORDER BY week_start;
```

## Expected result

| week_start | sessions | visitors | mobile_pct |
| --- | --- | --- | --- |
| 2025-01-06 | 73 | 66 | 63 |
| 2025-01-13 | 83 | 78 | 57.8 |
| 2025-01-20 | 108 | 93 | 55.6 |
| 2025-01-27 | 131 | 111 | 58 |
| 2025-02-03 | 104 | 96 | 60.6 |
| 2025-02-10 | 113 | 99 | 69 |
| 2025-02-17 | 115 | 101 | 67 |
| 2025-02-24 | 105 | 94 | 57.1 |
| 2025-03-03 | 126 | 105 | 64.3 |
| 2025-03-10 | 115 | 105 | 67.8 |
| 2025-03-17 | 91 | 81 | 54.9 |
| 2025-03-24 | 101 | 86 | 64.4 |

## Explanation

Date modifiers turn any day into the Monday of its week, so weeks can be grouped like any other value. Counting distinct visitors next to sessions shows how much repeat traffic there is.

**What it tells the business:** traffic runs at roughly 90 to 130 sessions a week after a slower start in January, and **about 55 to 69% of sessions are on mobile**. Any problem on the mobile site therefore touches most of the audience, which matters later in the project.

**Common mistake:** grouping by `strftime('%W', session_date)`. Week numbers restart every year and say nothing about which dates they cover; a week-start date is clearer in a report.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT date(session_date, 'weekday 0', '-6 days') AS week_start, COUNT(*) AS sessions, COUNT(visitor_id) AS visitors,
       ROUND(100.0 * SUM(device = 'mobile') / COUNT(*), 1) AS mobile_pct
FROM sessions GROUP BY week_start ORDER BY week_start;
```

Feedback: incorrect-output

```sql
SELECT date(session_date, 'weekday 1') AS week_start, COUNT(*) AS sessions, COUNT(DISTINCT visitor_id) AS visitors,
       ROUND(100.0 * SUM(device = 'mobile') / COUNT(*), 1) AS mobile_pct
FROM sessions GROUP BY week_start ORDER BY week_start;
```
