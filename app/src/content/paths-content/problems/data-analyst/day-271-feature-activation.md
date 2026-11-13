---
id: da-day-271
title: Did new users adopt the key feature in their first week?
order: 271
difficulty: intermediate
topic: Product analytics
summary: Measure activation as using a feature within seven days of sign-up, by sign-up week.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Define activation with a time window
  - Group by week starting Monday
prerequisites:
  - Day 156
  - Day 189
---

## Task

The product team calls a user **activated** if they used `export` within **7 days** of signing up (from the sign-up day to six days later). For each sign-up week (weeks start on Monday; use the Monday's date as the label), return `signup_week`, `users`, `activated` and `activation_pct` (rounded to 1 decimal place). Sort by `signup_week`.

## Starter query

```sql
WITH users(user_id, signed_up) AS (
  VALUES
    (1, '2025-03-03'), (2, '2025-03-04'), (3, '2025-03-05'), (4, '2025-03-07'), (5, '2025-03-08'),
    (6, '2025-03-10'), (7, '2025-03-11'), (8, '2025-03-12'), (9, '2025-03-14'), (10, '2025-03-16')
),
feature_events(user_id, used_on, feature) AS (
  VALUES
    (1, '2025-03-04', 'export'), (1, '2025-03-20', 'export'), (2, '2025-03-15', 'export'), (3, '2025-03-05', 'share'),
    (4, '2025-03-09', 'export'), (5, '2025-03-08', 'export'), (6, '2025-03-17', 'export'), (7, '2025-03-19', 'export'),
    (8, '2025-03-30', 'export'), (9, '2025-03-14', 'share'), (9, '2025-03-15', 'export')
)
SELECT u.user_id, u.signed_up, e.used_on, e.feature
FROM users AS u
LEFT JOIN feature_events AS e ON e.user_id = u.user_id
ORDER BY u.user_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Monday of the sign-up week: `date(signed_up, '-' || ((CAST(strftime('%w', signed_up) AS INTEGER) + 6) % 7) || ' days')` (`%w` is 0 on Sunday).
3. Per user, activated is `EXISTS` an `export` event with `used_on BETWEEN signed_up AND date(signed_up, '+6 days')`. Group by week: `COUNT(*)`, `SUM(activated)`.

## Solution

```sql
WITH users(user_id, signed_up) AS (
  VALUES
    (1, '2025-03-03'), (2, '2025-03-04'), (3, '2025-03-05'), (4, '2025-03-07'), (5, '2025-03-08'),
    (6, '2025-03-10'), (7, '2025-03-11'), (8, '2025-03-12'), (9, '2025-03-14'), (10, '2025-03-16')
),
feature_events(user_id, used_on, feature) AS (
  VALUES
    (1, '2025-03-04', 'export'), (1, '2025-03-20', 'export'), (2, '2025-03-15', 'export'), (3, '2025-03-05', 'share'),
    (4, '2025-03-09', 'export'), (5, '2025-03-08', 'export'), (6, '2025-03-17', 'export'), (7, '2025-03-19', 'export'),
    (8, '2025-03-30', 'export'), (9, '2025-03-14', 'share'), (9, '2025-03-15', 'export')
),
flagged AS (
  SELECT u.user_id,
    date(u.signed_up, '-' || ((CAST(strftime('%w', u.signed_up) AS INTEGER) + 6) % 7) || ' days') AS signup_week,
    EXISTS (
      SELECT 1 FROM feature_events AS e
      WHERE e.user_id = u.user_id AND e.feature = 'export' AND e.used_on BETWEEN u.signed_up AND date(u.signed_up, '+6 days')
    ) AS activated
  FROM users AS u
)
SELECT signup_week, COUNT(*) AS users, SUM(activated) AS activated, ROUND(100.0 * SUM(activated) / COUNT(*), 1) AS activation_pct
FROM flagged
GROUP BY signup_week
ORDER BY signup_week;
```

## Expected result

| signup_week | users | activated | activation_pct |
| --- | --- | --- | --- |
| 2025-03-03 | 5 | 3 | 60 |
| 2025-03-10 | 5 | 1 | 20 |

## Explanation

Activation is a time-boxed definition: using the key feature at all is not enough, it has to happen within the first week, because that is when habits form. The window sits inside an `EXISTS` subquery, so each user is counted once no matter how many times they exported.

The first sign-up week activated 60% of its users; the second only 20%. Users 6 and 7 did export, but 7 and 8 days after signing up, just outside the window, and user 2 only after 12 days. Grouping by the Monday of each sign-up week (Sunday's `%w` is 0, hence the `+ 6) % 7` shift) puts user 10, who signed up on a Sunday, into the week that started on 10 March.

**Common mistake:** counting any export ever. Late adopters inflate the number, and the first week rises to 80%, hiding how many users did not get value quickly.

## Wrong answers

Feedback: incorrect-output

```sql
WITH users(user_id, signed_up) AS ( VALUES (1, '2025-03-03'), (2, '2025-03-04'), (3, '2025-03-05'), (4, '2025-03-07'), (5, '2025-03-08'), (6, '2025-03-10'), (7, '2025-03-11'), (8, '2025-03-12'), (9, '2025-03-14'), (10, '2025-03-16') ), feature_events(user_id, used_on, feature) AS ( VALUES (1, '2025-03-04', 'export'), (1, '2025-03-20', 'export'), (2, '2025-03-15', 'export'), (3, '2025-03-05', 'share'), (4, '2025-03-09', 'export'), (5, '2025-03-08', 'export'), (6, '2025-03-17', 'export'), (7, '2025-03-19', 'export'), (8, '2025-03-30', 'export'), (9, '2025-03-14', 'share'), (9, '2025-03-15', 'export') ), flagged AS (SELECT u.user_id, date(u.signed_up, '-' || ((CAST(strftime('%w', u.signed_up) AS INTEGER) + 6) % 7) || ' days') AS signup_week, EXISTS (SELECT 1 FROM feature_events AS e WHERE e.user_id = u.user_id AND e.feature = 'export') AS activated FROM users AS u) SELECT signup_week, COUNT(*) AS users, SUM(activated) AS activated, ROUND(100.0 * SUM(activated) / COUNT(*), 1) AS activation_pct FROM flagged GROUP BY signup_week ORDER BY signup_week;
```
