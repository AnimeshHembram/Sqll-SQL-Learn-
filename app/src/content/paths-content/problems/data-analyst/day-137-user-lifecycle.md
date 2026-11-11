---
id: da-day-137
title: New, retained, reactivated and churned users
order: 137
difficulty: advanced
topic: Behavioural analytics
summary: Classify every user each month by comparing this month, last month and their history.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Classify users by comparing periods
  - Use EXISTS flags inside aggregates
prerequisites:
  - Day 116
  - Day 51
---

## Task

Each row of the starter query says a user was active in a month. For each month **from February 2025 to April 2025**, count users in four states:

- `new_users`: active this month for the first time ever,
- `retained`: active this month and last month,
- `reactivated`: active this month, not last month, but in some earlier month,
- `churned`: active last month but not this month.

Return `month`, `new_users`, `retained`, `reactivated` and `churned`. Sort by `month`.

## Starter query

```sql
WITH active_months(user_id, month) AS (
  VALUES
    ('u1', '2025-01'), ('u1', '2025-02'), ('u1', '2025-03'), ('u1', '2025-04'),
    ('u2', '2025-01'), ('u2', '2025-03'),
    ('u3', '2025-02'), ('u3', '2025-03'),
    ('u4', '2025-01'),
    ('u5', '2025-03'), ('u5', '2025-04'),
    ('u6', '2025-01'), ('u6', '2025-04'),
    ('u7', '2025-04')
)
SELECT month, COUNT(*) AS active_users
FROM active_months
GROUP BY month
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pair every user with every report month (`CROSS JOIN`), and work out three facts with `EXISTS`: active now, active last month (`strftime('%Y-%m', month || '-01', '-1 month')`), and active in any earlier month.
3. Then count with `SUM(CASE ...)`: new = now and not before; retained = now and last month; reactivated = now, not last month, but before; churned = last month and not now.

## Solution

```sql
WITH active_months(user_id, month) AS (
  VALUES
    ('u1', '2025-01'), ('u1', '2025-02'), ('u1', '2025-03'), ('u1', '2025-04'),
    ('u2', '2025-01'), ('u2', '2025-03'),
    ('u3', '2025-02'), ('u3', '2025-03'),
    ('u4', '2025-01'),
    ('u5', '2025-03'), ('u5', '2025-04'),
    ('u6', '2025-01'), ('u6', '2025-04'),
    ('u7', '2025-04')
),
report_months(month) AS (
  VALUES ('2025-02'), ('2025-03'), ('2025-04')
),
flags AS (
  SELECT m.month, u.user_id,
    EXISTS (SELECT 1 FROM active_months AS a WHERE a.user_id = u.user_id AND a.month = m.month) AS now_active,
    EXISTS (SELECT 1 FROM active_months AS a WHERE a.user_id = u.user_id
            AND a.month = strftime('%Y-%m', m.month || '-01', '-1 month')) AS last_active,
    EXISTS (SELECT 1 FROM active_months AS a WHERE a.user_id = u.user_id AND a.month < m.month) AS ever_before
  FROM report_months AS m
  CROSS JOIN (SELECT DISTINCT user_id FROM active_months) AS u
)
SELECT month,
  SUM(CASE WHEN now_active AND NOT ever_before THEN 1 ELSE 0 END) AS new_users,
  SUM(CASE WHEN now_active AND last_active THEN 1 ELSE 0 END) AS retained,
  SUM(CASE WHEN now_active AND NOT last_active AND ever_before THEN 1 ELSE 0 END) AS reactivated,
  SUM(CASE WHEN last_active AND NOT now_active THEN 1 ELSE 0 END) AS churned
FROM flags
GROUP BY month
ORDER BY month;
```

## Expected result

| month | new_users | retained | reactivated | churned |
| --- | --- | --- | --- | --- |
| 2025-02 | 1 | 1 | 0 | 3 |
| 2025-03 | 1 | 2 | 1 | 0 |
| 2025-04 | 1 | 2 | 1 | 2 |

## Explanation

This "growth accounting" view explains where each month's active users come from. Every active user is exactly one of new, retained or reactivated, so those three add up to the month's active users (check: April has 1 + 2 + 1 = 4 active users).

Reactivation is the state most reports forget. u2 was active in January, missed February and returned in March: not new, not retained, but reactivated. u6 returns in April after two quiet months.

**Common mistake:** calling every user who was not active last month "new", which counts u2 and u6 as new users and hides the fact that lapsed users come back.

## Wrong answers

Feedback: incorrect-output

```sql
WITH active_months(user_id, month) AS ( VALUES ('u1', '2025-01'), ('u1', '2025-02'), ('u1', '2025-03'), ('u1', '2025-04'), ('u2', '2025-01'), ('u2', '2025-03'), ('u3', '2025-02'), ('u3', '2025-03'), ('u4', '2025-01'), ('u5', '2025-03'), ('u5', '2025-04'), ('u6', '2025-01'), ('u6', '2025-04'), ('u7', '2025-04') ), report_months(month) AS (VALUES ('2025-02'), ('2025-03'), ('2025-04')), flags AS (SELECT m.month, u.user_id, EXISTS (SELECT 1 FROM active_months AS a WHERE a.user_id = u.user_id AND a.month = m.month) AS now_active, EXISTS (SELECT 1 FROM active_months AS a WHERE a.user_id = u.user_id AND a.month = strftime('%Y-%m', m.month || '-01', '-1 month')) AS last_active FROM report_months AS m CROSS JOIN (SELECT DISTINCT user_id FROM active_months) AS u) SELECT month, SUM(CASE WHEN now_active AND NOT last_active THEN 1 ELSE 0 END) AS new_users, SUM(CASE WHEN now_active AND last_active THEN 1 ELSE 0 END) AS retained, 0 AS reactivated, SUM(CASE WHEN last_active AND NOT now_active THEN 1 ELSE 0 END) AS churned FROM flags GROUP BY month ORDER BY month;
```
