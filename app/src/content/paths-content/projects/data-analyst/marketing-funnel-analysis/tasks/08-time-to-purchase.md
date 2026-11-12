---
id: mfa-08-time-to-purchase
title: How long buyers take to decide
order: 8
difficulty: intermediate
topic: Customer journeys
summary: Measure the days and sessions between a buyer's first visit and their purchase, grouped into bands.
module: channels
duration: 25
dataset: vidya-loop
tables:
  - sessions
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Measure time between events with julianday
  - Describe customer journeys in bands
prerequisites:
  - julianday
  - Correlated subqueries
  - CASE
---

## Task

How long does it take to sell a course? For every order, measure the **days** from the buyer's first session to the session in which they bought, and the number of **sessions** they had up to and including the buying session (session ids increase with time).

Group the orders into `decision_time` bands: `'1. Same day'` (0 days), `'2. 1-7 days'`, `'3. 8-21 days'` and `'4. 22+ days'`. Return `orders`, `avg_sessions` and `avg_days` (both one decimal) per band, sorted by `decision_time`.

## Starter query

```sql
SELECT visitor_id, MIN(session_date) AS first_visit, COUNT(*) AS sessions
FROM sessions
GROUP BY visitor_id
LIMIT 10;
```

## Hints

1. Find each visitor's first session date in a CTE. Days between two dates are `julianday(later) - julianday(earlier)`.
2. For the sessions up to the purchase, count the visitor's sessions with `session_id <=` the buying session's id, as a correlated subquery or a join and group.
3. Band the days with `CASE`; the labels start with a number so they sort in order.

## Solution

```sql
WITH first_visits AS (
  SELECT visitor_id, MIN(session_date) AS first_date
  FROM sessions
  GROUP BY visitor_id
),
journeys AS (
  SELECT o.order_id,
         julianday(s.session_date) - julianday(f.first_date) AS days,
         (SELECT COUNT(*) FROM sessions AS s2 WHERE s2.visitor_id = o.visitor_id AND s2.session_id <= o.session_id) AS sessions
  FROM orders AS o
  JOIN sessions AS s ON s.session_id = o.session_id
  JOIN first_visits AS f ON f.visitor_id = o.visitor_id
)
SELECT CASE
         WHEN days = 0 THEN '1. Same day'
         WHEN days <= 7 THEN '2. 1-7 days'
         WHEN days <= 21 THEN '3. 8-21 days'
         ELSE '4. 22+ days'
       END AS decision_time,
       COUNT(*) AS orders,
       ROUND(AVG(sessions), 1) AS avg_sessions,
       ROUND(AVG(days), 1) AS avg_days
FROM journeys
GROUP BY decision_time
ORDER BY decision_time;
```

## Expected result

| decision_time | orders | avg_sessions | avg_days |
| --- | --- | --- | --- |
| 1. Same day | 59 | 1 | 0 |
| 2. 1-7 days | 43 | 2.3 | 3.4 |
| 3. 8-21 days | 36 | 2.8 | 13.4 |
| 4. 22+ days | 3 | 4 | 24 |

## Explanation

`julianday` turns ISO dates into day numbers, so subtracting them gives the days between. The correlated subquery counts each buyer's sessions up to the purchase.

**What it tells the business:** **42% of orders (59 of 141) are placed on the day of the first visit**, mostly by visitors who arrived ready to buy. The rest take time: 43 orders come within a week after about 2.3 sessions, and 39 take longer than a week, with nearly three sessions or more. Those later buyers are the ones email reminders and retargeting are for, which is why email closes so many sales in Task 7.

**Common mistake:** subtracting the day-of-month parts of the dates (`substr(session_date, 9, 2)`). A visit on 28 January and a purchase on 3 February would come out as −25 days. Convert whole dates with `julianday` before subtracting.

## Wrong answers

Feedback: incorrect-output

```sql
WITH journeys AS (
  SELECT o.order_id, 0 AS days,
         (SELECT COUNT(*) FROM sessions AS s2 WHERE s2.visitor_id = o.visitor_id) AS sessions
  FROM orders AS o
)
SELECT CASE WHEN days = 0 THEN '1. Same day' WHEN days <= 7 THEN '2. 1-7 days' WHEN days <= 21 THEN '3. 8-21 days' ELSE '4. 22+ days' END AS decision_time,
       COUNT(*) AS orders, ROUND(AVG(sessions), 1) AS avg_sessions, ROUND(AVG(days), 1) AS avg_days
FROM journeys GROUP BY decision_time ORDER BY decision_time;
```

Feedback: incorrect-output

```sql
WITH first_visits AS (SELECT visitor_id, MIN(session_date) AS first_date FROM sessions GROUP BY visitor_id),
journeys AS (
  SELECT o.order_id, CAST(substr(s.session_date, 9, 2) AS INTEGER) - CAST(substr(f.first_date, 9, 2) AS INTEGER) AS days,
         (SELECT COUNT(*) FROM sessions AS s2 WHERE s2.visitor_id = o.visitor_id AND s2.session_id <= o.session_id) AS sessions
  FROM orders AS o JOIN sessions AS s ON s.session_id = o.session_id JOIN first_visits AS f ON f.visitor_id = o.visitor_id
)
SELECT CASE WHEN days = 0 THEN '1. Same day' WHEN days <= 7 THEN '2. 1-7 days' WHEN days <= 21 THEN '3. 8-21 days' ELSE '4. 22+ days' END AS decision_time,
       COUNT(*) AS orders, ROUND(AVG(sessions), 1) AS avg_sessions, ROUND(AVG(days), 1) AS avg_days
FROM journeys GROUP BY decision_time ORDER BY decision_time;
```
