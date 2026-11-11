---
id: da-day-109
title: Monthly churn rate of subscriptions
order: 109
difficulty: advanced
topic: Metrics
summary: Define the population at the start of each month, then count who left during it.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Define a rate's population precisely
  - Test date ranges with NULL end dates
prerequisites:
  - Day 46
  - Data Analyst chapter: Cohorts and retention
---

## Task

Subscriptions have a start date and an end date (`NULL` while active), in the starter query. For each month listed in `months`, return:

- `month` (`YYYY-MM`),
- `active_at_start`: subscriptions that started **before** the 1st of the month and had not ended before it (an end date on the 1st still counts as active),
- `churned`: how many of those ended **during** that month,
- `churn_pct`: `churned` as a percentage of `active_at_start`, rounded to 1 decimal place.

Sort by `month`.

## Starter query

```sql
WITH subscriptions(customer, started, ended) AS (
  VALUES
    ('A', '2024-11-10', NULL), ('B', '2024-12-01', '2025-01-15'), ('C', '2025-01-05', '2025-02-28'),
    ('D', '2025-01-20', '2025-03-10'), ('E', '2025-02-01', '2025-02-01'), ('F', '2025-02-14', '2025-03-31'),
    ('G', '2025-03-03', NULL)
),
months(month_start) AS (
  VALUES ('2025-01-01'), ('2025-02-01'), ('2025-03-01')
)
SELECT m.month_start, s.customer, s.started, s.ended
FROM months AS m
CROSS JOIN subscriptions AS s
ORDER BY m.month_start, s.customer;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join each month to the subscriptions active at its start: `LEFT JOIN subscriptions AS s ON s.started < m.month_start AND (s.ended IS NULL OR s.ended >= m.month_start)`.
3. A subscription churned during the month if `s.ended < date(m.month_start, '+1 month')`. Count those with `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` and group by the month.

## Solution

```sql
WITH subscriptions(customer, started, ended) AS (
  VALUES
    ('A', '2024-11-10', NULL), ('B', '2024-12-01', '2025-01-15'), ('C', '2025-01-05', '2025-02-28'),
    ('D', '2025-01-20', '2025-03-10'), ('E', '2025-02-01', '2025-02-01'), ('F', '2025-02-14', '2025-03-31'),
    ('G', '2025-03-03', NULL)
),
months(month_start) AS (
  VALUES ('2025-01-01'), ('2025-02-01'), ('2025-03-01')
)
SELECT strftime('%Y-%m', m.month_start) AS month,
  COUNT(s.customer) AS active_at_start,
  SUM(CASE WHEN s.ended < date(m.month_start, '+1 month') THEN 1 ELSE 0 END) AS churned,
  ROUND(100.0 * SUM(CASE WHEN s.ended < date(m.month_start, '+1 month') THEN 1 ELSE 0 END) / COUNT(s.customer), 1) AS churn_pct
FROM months AS m
LEFT JOIN subscriptions AS s
  ON s.started < m.month_start
 AND (s.ended IS NULL OR s.ended >= m.month_start)
GROUP BY m.month_start
ORDER BY m.month_start;
```

## Expected result

| month | active_at_start | churned | churn_pct |
| --- | --- | --- | --- |
| 2025-01 | 2 | 1 | 50 |
| 2025-02 | 3 | 1 | 33.3 |
| 2025-03 | 3 | 2 | 66.7 |

## Explanation

A rate needs a clearly defined denominator. Churn is measured against the subscriptions **active at the start** of the month; people who join during the month are not at risk yet and are left out of both numbers.

In February, three subscriptions were active on the 1st (A, C and D) and C ended on the 28th. E started and ended on 1 February: it was never active at the start of a month, so it does not affect any churn rate, although a real report would list such instant cancellations separately. In March, two of three active subscriptions ended.

**Common mistake:** counting every subscription that existed at some point in the month as the denominator, which mixes new and existing customers and makes churn look lower.

## Wrong answers

Feedback: incorrect-output

```sql
WITH subscriptions(customer, started, ended) AS ( VALUES ('A', '2024-11-10', NULL), ('B', '2024-12-01', '2025-01-15'), ('C', '2025-01-05', '2025-02-28'), ('D', '2025-01-20', '2025-03-10'), ('E', '2025-02-01', '2025-02-01'), ('F', '2025-02-14', '2025-03-31'), ('G', '2025-03-03', NULL) ), months(month_start) AS ( VALUES ('2025-01-01'), ('2025-02-01'), ('2025-03-01') ) SELECT strftime('%Y-%m', m.month_start) AS month, COUNT(s.customer) AS active_at_start, SUM(CASE WHEN s.ended < date(m.month_start, '+1 month') THEN 1 ELSE 0 END) AS churned, ROUND(100.0 * SUM(CASE WHEN s.ended < date(m.month_start, '+1 month') THEN 1 ELSE 0 END) / COUNT(s.customer), 1) AS churn_pct FROM months AS m LEFT JOIN subscriptions AS s ON s.started < date(m.month_start, '+1 month') AND (s.ended IS NULL OR s.ended >= m.month_start) GROUP BY m.month_start ORDER BY m.month_start;
```
