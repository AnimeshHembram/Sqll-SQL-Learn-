---
id: mfa-03-visitor-funnel
title: The visitor funnel
order: 3
difficulty: intermediate
topic: Funnel analysis
summary: Build the funnel from visit to purchase, counting each visitor at the furthest step they reached, with step and overall conversion.
module: funnel
duration: 30
dataset: vidya-loop
tables:
  - sessions
  - events
orderMatters: true
checkColumnNames: true
objectives:
  - Build a funnel from an event log
  - Calculate step and overall conversion with window functions
prerequisites:
  - CASE
  - VALUES in a CTE
  - LAG and FIRST_VALUE
---

## Task

Visitors move through five steps: **view_course → signup → start_trial → checkout → purchase**, often over several sessions. Count each visitor once, at the **furthest step** they reached in any session; a visitor who reached a step also passed all the steps before it.

Return one row per step, including a first row `'visit'` for every visitor: `step`, `visitors` (visitors who reached at least that step), `pct_of_previous` (one decimal, NULL for `'visit'`) and `pct_of_visitors` (one decimal). Keep the steps in funnel order.

## Starter query

```sql
SELECT s.visitor_id, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
FROM sessions AS s
LEFT JOIN events AS e ON e.session_id = s.session_id
GROUP BY s.visitor_id
LIMIT 10;
```

## Hints

1. The starter query gives each visitor a furthest step from 0 (visit only) to 5 (purchase). Keep it as a CTE.
2. Write the steps as a small table: `steps(step_no, step) AS (VALUES (0, 'visit'), (1, 'view_course'), ...)`. Join visitors to it with `furthest_step >= step_no` and count per step.
3. `LAG(visitors) OVER (ORDER BY step_no)` is the previous step; `FIRST_VALUE(visitors) OVER (ORDER BY step_no)` is the number of visitors.

## Solution

```sql
WITH furthest AS (
  SELECT s.visitor_id, MIN(s.device) AS device, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
  FROM sessions AS s
  LEFT JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.visitor_id
),
steps (step_no, step) AS (
  VALUES (0, 'visit'), (1, 'view_course'), (2, 'signup'), (3, 'start_trial'), (4, 'checkout'), (5, 'purchase')
),
counts AS (
  SELECT st.step_no, st.step, COUNT(f.visitor_id) AS visitors
  FROM steps AS st
  LEFT JOIN furthest AS f ON f.furthest_step >= st.step_no
  GROUP BY st.step_no, st.step
)
SELECT step,
       visitors,
       ROUND(100.0 * visitors / LAG(visitors) OVER (ORDER BY step_no), 1) AS pct_of_previous,
       ROUND(100.0 * visitors / FIRST_VALUE(visitors) OVER (ORDER BY step_no), 1) AS pct_of_visitors
FROM counts
ORDER BY step_no;
```

## Expected result

| step | visitors | pct_of_previous | pct_of_visitors |
| --- | --- | --- | --- |
| visit | 900 | NULL | 100 |
| view_course | 644 | 71.6 | 71.6 |
| signup | 359 | 55.7 | 39.9 |
| start_trial | 303 | 84.4 | 33.7 |
| checkout | 227 | 74.9 | 25.2 |
| purchase | 141 | 62.1 | 15.7 |

## Explanation

Ranking steps and taking each visitor's maximum makes the funnel robust to the tracking problems from Task 2: duplicates do not matter, and a purchase counts as reaching checkout even when the checkout event was lost. The `VALUES` list gives the funnel a fixed order and keeps steps nobody reached.

**What it tells the business:** of 900 visitors, 71.6% viewed a course, 39.9% signed up and **15.7% bought**. Two steps lose the most: **view course → signup (55.7% continue)** and **checkout → purchase (62.1%)**. Losing almost four in ten people who already chose a course and reached the payment page is the most expensive leak, because those visitors cost the most to bring that far.

**Common mistake:** counting each visitor's events step by step without the "furthest step" logic. A visitor who bought but whose checkout event was lost would be missing from checkout and present at purchase, so the funnel would show more purchases than checkouts in places.

## Wrong answers

Feedback: incorrect-output

```sql
WITH steps (step_no, step) AS (
  VALUES (0, 'visit'), (1, 'view_course'), (2, 'signup'), (3, 'start_trial'), (4, 'checkout'), (5, 'purchase')
),
counts AS (
  SELECT st.step_no, st.step,
         CASE WHEN st.step_no = 0 THEN (SELECT COUNT(DISTINCT visitor_id) FROM sessions)
              ELSE (SELECT COUNT(*) FROM events AS e WHERE e.step = st.step) END AS visitors
  FROM steps AS st
)
SELECT step, visitors,
       ROUND(100.0 * visitors / LAG(visitors) OVER (ORDER BY step_no), 1) AS pct_of_previous,
       ROUND(100.0 * visitors / FIRST_VALUE(visitors) OVER (ORDER BY step_no), 1) AS pct_of_visitors
FROM counts ORDER BY step_no;
```

Feedback: incorrect-output

```sql
WITH furthest AS (
  SELECT s.visitor_id, MIN(s.device) AS device, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
  FROM sessions AS s
  LEFT JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.visitor_id
),
steps (step_no, step) AS (
  VALUES (0, 'visit'), (1, 'view_course'), (2, 'signup'), (3, 'start_trial'), (4, 'checkout'), (5, 'purchase')
),
counts AS (
  SELECT st.step_no, st.step, COUNT(f.visitor_id) AS visitors
  FROM steps AS st LEFT JOIN furthest AS f ON f.furthest_step = st.step_no
  GROUP BY st.step_no, st.step
)
SELECT step, visitors,
       ROUND(100.0 * visitors / LAG(visitors) OVER (ORDER BY step_no), 1) AS pct_of_previous,
       ROUND(100.0 * visitors / FIRST_VALUE(visitors) OVER (ORDER BY step_no), 1) AS pct_of_visitors
FROM counts ORDER BY step_no;
```
