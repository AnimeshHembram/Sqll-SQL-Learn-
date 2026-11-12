---
id: mfa-05-weekly-checkout-conversion
title: Weekly checkout conversion
order: 5
difficulty: advanced
topic: Trends
summary: Track the share of checkout sessions that end in a purchase each week, smoothed with a three-week moving average.
module: funnel
duration: 25
dataset: vidya-loop
tables:
  - sessions
  - events
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate a moving average with a window frame
  - Read a noisy trend
prerequisites:
  - Window frames
  - HAVING
  - date() modifiers
---

## Task

How has checkout conversion moved over the quarter? A session **reached checkout** if it has a `'checkout'` or a `'purchase'` event (Task 2 showed some checkout events were lost).

For each `week_start` (the Monday, as in Task 1), return `checkout_sessions`, `purchases` (of those sessions, how many have a purchase), `conversion_pct` (one decimal) and `moving_avg_pct`: the average of `conversion_pct` over this week and the two before it, one decimal. Sort by `week_start`.

## Starter query

```sql
SELECT s.session_id, s.session_date, e.step
FROM sessions AS s
JOIN events AS e ON e.session_id = s.session_id
WHERE e.step IN ('checkout', 'purchase')
ORDER BY s.session_id
LIMIT 20;
```

## Hints

1. First make one row per checkout session: group events by session and keep `HAVING MAX(e.step IN ('checkout', 'purchase')) = 1`, with `MAX(e.step = 'purchase')` as a purchased flag.
2. Then group those sessions by week and compute the weekly conversion in a second CTE.
3. A moving average is a window with a frame: `AVG(conversion) OVER (ORDER BY week_start ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`. Round only at the end.

## Solution

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
weekly AS (
  SELECT date(s.session_date, 'weekday 0', '-6 days') AS week_start,
         COUNT(*) AS checkout_sessions,
         SUM(c.purchased) AS purchases,
         100.0 * SUM(c.purchased) / COUNT(*) AS conversion
  FROM checkouts AS c
  JOIN sessions AS s ON s.session_id = c.session_id
  GROUP BY week_start
)
SELECT week_start,
       checkout_sessions,
       purchases,
       ROUND(conversion, 1) AS conversion_pct,
       ROUND(AVG(conversion) OVER (ORDER BY week_start ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_pct
FROM weekly
ORDER BY week_start;
```

## Expected result

| week_start | checkout_sessions | purchases | conversion_pct | moving_avg_pct |
| --- | --- | --- | --- | --- |
| 2025-01-06 | 15 | 8 | 53.3 | 53.3 |
| 2025-01-13 | 17 | 9 | 52.9 | 53.1 |
| 2025-01-20 | 28 | 8 | 28.6 | 44.9 |
| 2025-01-27 | 25 | 15 | 60 | 47.2 |
| 2025-02-03 | 25 | 6 | 24 | 37.5 |
| 2025-02-10 | 24 | 11 | 45.8 | 43.3 |
| 2025-02-17 | 25 | 17 | 68 | 45.9 |
| 2025-02-24 | 22 | 14 | 63.6 | 59.2 |
| 2025-03-03 | 27 | 12 | 44.4 | 58.7 |
| 2025-03-10 | 26 | 15 | 57.7 | 55.3 |
| 2025-03-17 | 28 | 13 | 46.4 | 49.5 |
| 2025-03-24 | 24 | 13 | 54.2 | 52.8 |

## Explanation

`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` makes a three-week window that slides down the table; the first two weeks average over the rows that exist. Rounding after averaging keeps small rounding errors from adding up.

**What it tells the business:** with only 15 to 28 checkouts a week, weekly conversion jumps between 24% and 68%, which is why a moving average helps. The smoothed line sits at **38 to 47% from late January to mid-February** and rises to **50 to 59% from late February**, once the window covers the weeks when half of checkout visitors saw the new checkout page (from 17 February). A trend line cannot prove the cause, but it tells you where to look: the experiment itself.

**Common mistake:** counting only sessions with a `'checkout'` event. The 9 purchases whose checkout event was lost would drop out of the denominator but stay in the purchases, pushing some weeks' conversion artificially high.

## Wrong answers

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
weekly AS (
  SELECT date(s.session_date, 'weekday 0', '-6 days') AS week_start, COUNT(*) AS checkout_sessions, SUM(c.purchased) AS purchases,
         100.0 * SUM(c.purchased) / COUNT(*) AS conversion
  FROM checkouts AS c JOIN sessions AS s ON s.session_id = c.session_id
  GROUP BY week_start
)
SELECT week_start, checkout_sessions, purchases, ROUND(conversion, 1) AS conversion_pct,
       ROUND(AVG(conversion) OVER (ORDER BY week_start ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 1) AS moving_avg_pct
FROM weekly ORDER BY week_start;
```

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id HAVING MAX(e.step = 'checkout') = 1
),
weekly AS (
  SELECT date(s.session_date, 'weekday 0', '-6 days') AS week_start, COUNT(*) AS checkout_sessions, SUM(c.purchased) AS purchases,
         100.0 * SUM(c.purchased) / COUNT(*) AS conversion
  FROM checkouts AS c JOIN sessions AS s ON s.session_id = c.session_id
  GROUP BY week_start
)
SELECT week_start, checkout_sessions, purchases, ROUND(conversion, 1) AS conversion_pct,
       ROUND(AVG(conversion) OVER (ORDER BY week_start ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_pct
FROM weekly ORDER BY week_start;
```
