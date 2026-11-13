---
id: da-day-306
title: Where checkouts are abandoned, by device
order: 306
difficulty: intermediate
topic: E-commerce
summary: Count sessions reaching each checkout step per device and the drop-off from the previous step.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count a funnel from furthest steps
  - Compare each step with the previous one
prerequisites:
  - Day 156
  - Day 285
---

## Task

Each checkout session records the **furthest step** it reached (starter query; steps 1 to 4, from cart to confirmed). A session that reached step 3 also passed steps 1 and 2. For each device and step, return `device`, `step`, `name`, `sessions` (sessions that reached at least that step) and `continue_pct` (sessions at this step ÷ sessions at the previous step × 100, rounded to 1 decimal place; `NULL` for step 1).

Sort by `device`, then `step`.

## Starter query

```sql
WITH sessions(session_id, device, reached_step) AS (
  VALUES
    (1, 'mobile', 1), (2, 'mobile', 2), (3, 'mobile', 2), (4, 'mobile', 3), (5, 'mobile', 4), (6, 'mobile', 2),
    (7, 'mobile', 1), (8, 'mobile', 4), (9, 'desktop', 4), (10, 'desktop', 3), (11, 'desktop', 4), (12, 'desktop', 2),
    (13, 'desktop', 4), (14, 'desktop', 1)
),
steps(step, name) AS (
  VALUES (1, 'cart'), (2, 'address'), (3, 'payment'), (4, 'confirmed')
)
SELECT session_id, device, reached_step
FROM sessions
ORDER BY device, session_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join every session to every step it passed: `JOIN steps AS st ON st.step <= s.reached_step`, then count sessions per device and step. To keep steps nobody reached, start from devices × steps and `LEFT JOIN`.
3. Previous step's count: `LAG(sessions) OVER (PARTITION BY device ORDER BY step)`.

## Solution

```sql
WITH sessions(session_id, device, reached_step) AS (
  VALUES
    (1, 'mobile', 1), (2, 'mobile', 2), (3, 'mobile', 2), (4, 'mobile', 3), (5, 'mobile', 4), (6, 'mobile', 2),
    (7, 'mobile', 1), (8, 'mobile', 4), (9, 'desktop', 4), (10, 'desktop', 3), (11, 'desktop', 4), (12, 'desktop', 2),
    (13, 'desktop', 4), (14, 'desktop', 1)
),
steps(step, name) AS (
  VALUES (1, 'cart'), (2, 'address'), (3, 'payment'), (4, 'confirmed')
),
devices AS (
  SELECT DISTINCT device FROM sessions
),
reached AS (
  SELECT d.device, st.step, st.name, COUNT(s.session_id) AS sessions
  FROM devices AS d
  CROSS JOIN steps AS st
  LEFT JOIN sessions AS s ON s.device = d.device AND s.reached_step >= st.step
  GROUP BY d.device, st.step, st.name
)
SELECT device, step, name, sessions,
  ROUND(100.0 * sessions / LAG(sessions) OVER (PARTITION BY device ORDER BY step), 1) AS continue_pct
FROM reached
ORDER BY device, step;
```

## Expected result

| device | step | name | sessions | continue_pct |
| --- | --- | --- | --- | --- |
| desktop | 1 | cart | 6 | NULL |
| desktop | 2 | address | 5 | 83.3 |
| desktop | 3 | payment | 4 | 80 |
| desktop | 4 | confirmed | 3 | 75 |
| mobile | 1 | cart | 8 | NULL |
| mobile | 2 | address | 6 | 75 |
| mobile | 3 | payment | 3 | 50 |
| mobile | 4 | confirmed | 2 | 66.7 |

## Explanation

A session that reached step 3 also passed steps 1 and 2, so a step's count is every session whose furthest step is **at least** that step. Joining each device to each step and counting sessions with `reached_step >= step` gives the funnel; starting from devices × steps keeps a step that nobody reached as a 0.

Mobile loses users at the payment step: only half of mobile sessions that entered an address moved on, against 80% on desktop. That points to a payment page problem on small screens, the same kind of finding as Vidya Loop's checkout (project 3), and a cheaper fix than more traffic.

**Common mistake:** counting sessions by their furthest step only. That gives how many sessions **stopped** at each step, not how many reached it, so the "funnel" goes up and down and the continuation rates are meaningless.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sessions(session_id, device, reached_step) AS ( VALUES (1, 'mobile', 1), (2, 'mobile', 2), (3, 'mobile', 2), (4, 'mobile', 3), (5, 'mobile', 4), (6, 'mobile', 2), (7, 'mobile', 1), (8, 'mobile', 4), (9, 'desktop', 4), (10, 'desktop', 3), (11, 'desktop', 4), (12, 'desktop', 2), (13, 'desktop', 4), (14, 'desktop', 1) ), steps(step, name) AS ( VALUES (1, 'cart'), (2, 'address'), (3, 'payment'), (4, 'confirmed') ), reached AS (SELECT s.device, st.step, st.name, COUNT(*) AS sessions FROM sessions AS s JOIN steps AS st ON st.step = s.reached_step GROUP BY s.device, st.step, st.name) SELECT device, step, name, sessions, ROUND(100.0 * sessions / LAG(sessions) OVER (PARTITION BY device ORDER BY step), 1) AS continue_pct FROM reached ORDER BY device, step;
```
