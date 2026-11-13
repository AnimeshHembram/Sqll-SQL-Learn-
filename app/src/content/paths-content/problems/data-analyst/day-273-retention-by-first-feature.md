---
id: da-day-273
title: Which first feature predicts retention?
order: 273
difficulty: advanced
topic: Product analytics
summary: Group users by the first feature they used and compare how many came back a week later.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find each user's first action
  - Compare retention between groups
prerequisites:
  - Day 139
  - Day 271
---

## Task

For each user (starter query), find the **first feature** they used (their earliest event; ties do not occur). A user is **retained** if they had any event between **7 and 13 days** after signing up. Group users by first feature and return `first_feature`, `users`, `retained` and `retention_pct` (rounded to 1 decimal place). Sort by `retention_pct` from highest, then `first_feature`.

All users in this data used at least one feature.

## Starter query

```sql
WITH users(user_id, signed_up) AS (
  VALUES (1, '2025-03-01'), (2, '2025-03-01'), (3, '2025-03-02'), (4, '2025-03-02'), (5, '2025-03-03'),
         (6, '2025-03-03'), (7, '2025-03-04'), (8, '2025-03-04'), (9, '2025-03-05')
),
events(user_id, happened_on, feature) AS (
  VALUES
    (1, '2025-03-01', 'templates'), (1, '2025-03-09', 'editor'), (2, '2025-03-01', 'editor'), (2, '2025-03-02', 'templates'),
    (3, '2025-03-02', 'templates'), (3, '2025-03-10', 'templates'), (4, '2025-03-02', 'import'), (5, '2025-03-04', 'editor'),
    (5, '2025-03-11', 'editor'), (6, '2025-03-03', 'templates'), (7, '2025-03-04', 'import'), (7, '2025-03-12', 'editor'),
    (8, '2025-03-05', 'editor'), (9, '2025-03-05', 'import'), (9, '2025-03-08', 'import')
)
SELECT u.user_id, u.signed_up, e.happened_on, e.feature
FROM users AS u
JOIN events AS e ON e.user_id = u.user_id
ORDER BY u.user_id, e.happened_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. First feature: `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY happened_on)` on events, keeping row 1.
3. Retained: `EXISTS` an event with `julianday(happened_on) - julianday(signed_up) BETWEEN 7 AND 13`. Group by first feature.

## Solution

```sql
WITH users(user_id, signed_up) AS (
  VALUES (1, '2025-03-01'), (2, '2025-03-01'), (3, '2025-03-02'), (4, '2025-03-02'), (5, '2025-03-03'),
         (6, '2025-03-03'), (7, '2025-03-04'), (8, '2025-03-04'), (9, '2025-03-05')
),
events(user_id, happened_on, feature) AS (
  VALUES
    (1, '2025-03-01', 'templates'), (1, '2025-03-09', 'editor'), (2, '2025-03-01', 'editor'), (2, '2025-03-02', 'templates'),
    (3, '2025-03-02', 'templates'), (3, '2025-03-10', 'templates'), (4, '2025-03-02', 'import'), (5, '2025-03-04', 'editor'),
    (5, '2025-03-11', 'editor'), (6, '2025-03-03', 'templates'), (7, '2025-03-04', 'import'), (7, '2025-03-12', 'editor'),
    (8, '2025-03-05', 'editor'), (9, '2025-03-05', 'import'), (9, '2025-03-08', 'import')
),
firsts AS (
  SELECT user_id, feature AS first_feature
  FROM (SELECT user_id, feature, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY happened_on) AS rn FROM events)
  WHERE rn = 1
),
flagged AS (
  SELECT f.first_feature,
    EXISTS (
      SELECT 1 FROM events AS e
      WHERE e.user_id = u.user_id AND julianday(e.happened_on) - julianday(u.signed_up) BETWEEN 7 AND 13
    ) AS retained
  FROM users AS u
  JOIN firsts AS f ON f.user_id = u.user_id
)
SELECT first_feature, COUNT(*) AS users, SUM(retained) AS retained, ROUND(100.0 * SUM(retained) / COUNT(*), 1) AS retention_pct
FROM flagged
GROUP BY first_feature
ORDER BY retention_pct DESC, first_feature;
```

## Expected result

| first_feature | users | retained | retention_pct |
| --- | --- | --- | --- |
| templates | 3 | 2 | 66.7 |
| editor | 3 | 1 | 33.3 |
| import | 3 | 1 | 33.3 |

## Explanation

Which first experience leads to coming back? Users whose first action was `templates` returned in their second week two times out of three; users who started with the editor or an import came back a third of the time. That is the kind of evidence that makes a team put templates on the welcome screen, though with three users per group it is a hint, not proof.

The first feature comes from `ROW_NUMBER()` over each user's events, keeping row 1, so each user belongs to exactly one group. Retention is measured in a fixed window (days 7 to 13 after sign-up) so that every user had the same chance to come back.

**Common mistake:** joining users to all their events instead of only the first. A user who tried several features is counted under each of them, so the groups overlap and the comparison is meaningless.

## Wrong answers

Feedback: incorrect-output

```sql
WITH users(user_id, signed_up) AS ( VALUES (1, '2025-03-01'), (2, '2025-03-01'), (3, '2025-03-02'), (4, '2025-03-02'), (5, '2025-03-03'), (6, '2025-03-03'), (7, '2025-03-04'), (8, '2025-03-04'), (9, '2025-03-05') ), events(user_id, happened_on, feature) AS ( VALUES (1, '2025-03-01', 'templates'), (1, '2025-03-09', 'editor'), (2, '2025-03-01', 'editor'), (2, '2025-03-02', 'templates'), (3, '2025-03-02', 'templates'), (3, '2025-03-10', 'templates'), (4, '2025-03-02', 'import'), (5, '2025-03-04', 'editor'), (5, '2025-03-11', 'editor'), (6, '2025-03-03', 'templates'), (7, '2025-03-04', 'import'), (7, '2025-03-12', 'editor'), (8, '2025-03-05', 'editor'), (9, '2025-03-05', 'import'), (9, '2025-03-08', 'import') ), flagged AS (SELECT e.feature AS first_feature, u.user_id, EXISTS (SELECT 1 FROM events AS x WHERE x.user_id = u.user_id AND julianday(x.happened_on) - julianday(u.signed_up) BETWEEN 7 AND 13) AS retained FROM users AS u JOIN events AS e ON e.user_id = u.user_id) SELECT first_feature, COUNT(DISTINCT user_id) AS users, SUM(retained) AS retained, ROUND(100.0 * SUM(retained) / COUNT(DISTINCT user_id), 1) AS retention_pct FROM flagged GROUP BY first_feature ORDER BY retention_pct DESC, first_feature;
```
