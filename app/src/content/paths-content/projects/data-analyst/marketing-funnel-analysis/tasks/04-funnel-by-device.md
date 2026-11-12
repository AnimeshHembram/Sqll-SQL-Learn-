---
id: mfa-04-funnel-by-device
title: Where mobile visitors drop off
order: 4
difficulty: intermediate
topic: Segmentation
summary: Compare each funnel step's conversion on mobile and desktop to find the step where mobile falls behind.
module: funnel
duration: 25
dataset: vidya-loop
tables:
  - sessions
  - events
orderMatters: true
checkColumnNames: true
objectives:
  - Compare funnels between segments
  - Use step-specific denominators
prerequisites:
  - Conditional aggregation
  - Common table expressions
---

## Task

Most visitors are on mobile. Using each visitor's furthest step (as in Task 3) and their device (every visitor used one device), return one row per `device` with:

`visitors`, and the conversion **from the previous step** for each step, as percentages with one decimal: `view_pct` (of visitors), `signup_pct` (of course viewers), `trial_pct`, `checkout_pct` and `purchase_pct`.

Sort by `device`.

## Starter query

```sql
WITH furthest AS (
  SELECT s.visitor_id, MIN(s.device) AS device, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
  FROM sessions AS s
  LEFT JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.visitor_id
)
SELECT device, COUNT(*) AS visitors
FROM furthest
GROUP BY device;
```

## Hints

1. Keep the furthest-step CTE from Task 3; it already has each visitor's device.
2. `SUM(furthest_step >= 2)` counts visitors who reached signup. Each step's conversion divides that by the count for the step before: `SUM(furthest_step >= 2)` over `SUM(furthest_step >= 1)`.
3. Write the five percentages side by side in one `SELECT`, grouped by device, each with `100.0 *` and `ROUND(..., 1)`.

## Solution

```sql
WITH furthest AS (
  SELECT s.visitor_id, MIN(s.device) AS device, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
  FROM sessions AS s
  LEFT JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.visitor_id
)
SELECT device,
       COUNT(*) AS visitors,
       ROUND(100.0 * SUM(furthest_step >= 1) / COUNT(*), 1) AS view_pct,
       ROUND(100.0 * SUM(furthest_step >= 2) / SUM(furthest_step >= 1), 1) AS signup_pct,
       ROUND(100.0 * SUM(furthest_step >= 3) / SUM(furthest_step >= 2), 1) AS trial_pct,
       ROUND(100.0 * SUM(furthest_step >= 4) / SUM(furthest_step >= 3), 1) AS checkout_pct,
       ROUND(100.0 * SUM(furthest_step >= 5) / SUM(furthest_step >= 4), 1) AS purchase_pct
FROM furthest
GROUP BY device
ORDER BY device;
```

## Expected result

| device | visitors | view_pct | signup_pct | trial_pct | checkout_pct | purchase_pct |
| --- | --- | --- | --- | --- | --- | --- |
| desktop | 347 | 72 | 50.8 | 86.6 | 76.4 | 76.2 |
| mobile | 553 | 71.2 | 58.9 | 83.2 | 74.1 | 53.8 |

## Explanation

Putting the steps side by side for each segment makes the odd one out easy to spot. Each ratio uses its own denominator, the visitors who reached the step before.

**What it tells the business:** mobile and desktop visitors behave almost the same until the last step; mobile visitors even sign up slightly more often (58.9% against 50.8%). Then **only 53.8% of mobile visitors who reach checkout complete the purchase, against 76.2% on desktop**. Something on the mobile checkout page is losing paying customers, which is exactly why the product team started an A/B test (Milestone 4).

**Common mistake:** dividing every step by all visitors. That shows how many people reach each step overall, but hides *where* they leave: the gap at checkout would look like a small difference spread across the whole funnel.

## Wrong answers

Feedback: incorrect-output

```sql
WITH furthest AS (
  SELECT s.visitor_id, MIN(s.device) AS device, MAX(CASE e.step WHEN 'view_course' THEN 1 WHEN 'signup' THEN 2 WHEN 'start_trial' THEN 3 WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 ELSE 0 END) AS furthest_step
  FROM sessions AS s
  LEFT JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.visitor_id
)
SELECT device, COUNT(*) AS visitors,
       ROUND(100.0 * SUM(furthest_step >= 1) / COUNT(*), 1) AS view_pct,
       ROUND(100.0 * SUM(furthest_step >= 2) / COUNT(*), 1) AS signup_pct,
       ROUND(100.0 * SUM(furthest_step >= 3) / COUNT(*), 1) AS trial_pct,
       ROUND(100.0 * SUM(furthest_step >= 4) / COUNT(*), 1) AS checkout_pct,
       ROUND(100.0 * SUM(furthest_step >= 5) / COUNT(*), 1) AS purchase_pct
FROM furthest GROUP BY device ORDER BY device;
```

Feedback: incorrect-output

```sql
SELECT s.device, COUNT(DISTINCT s.visitor_id) AS visitors,
       ROUND(100.0 * SUM(e.step = 'view_course') / COUNT(DISTINCT s.visitor_id), 1) AS view_pct,
       ROUND(100.0 * SUM(e.step = 'signup') / SUM(e.step = 'view_course'), 1) AS signup_pct,
       ROUND(100.0 * SUM(e.step = 'start_trial') / SUM(e.step = 'signup'), 1) AS trial_pct,
       ROUND(100.0 * SUM(e.step = 'checkout') / SUM(e.step = 'start_trial'), 1) AS checkout_pct,
       ROUND(100.0 * SUM(e.step = 'purchase') / SUM(e.step = 'checkout'), 1) AS purchase_pct
FROM sessions AS s LEFT JOIN events AS e ON e.session_id = s.session_id
GROUP BY s.device ORDER BY s.device;
```
