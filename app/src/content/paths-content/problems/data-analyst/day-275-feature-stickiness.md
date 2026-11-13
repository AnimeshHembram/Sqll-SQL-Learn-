---
id: da-day-275
title: Which features are habits?
order: 275
difficulty: intermediate
topic: Product analytics
summary: Compare each feature's average daily users with its weekly users to see which ones people use every day.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure stickiness
  - Average over a fixed period, not over active days
prerequisites:
  - Day 136
  - Day 272
---

## Task

For the week of **10 to 16 March 2025** (starter query), compute for each feature:

- `weekly_users`: distinct users who used it that week,
- `avg_daily_users`: distinct users per day, averaged over the **7 days** of the week (days with no use count as 0), rounded to 2 decimal places,
- `stickiness_pct`: average daily users ÷ weekly users × 100, rounded to 1 decimal place.

Include only features used that week. Sort by `stickiness_pct` from highest.

## Starter query

```sql
WITH usage(user_id, day, feature) AS (
  VALUES
    (1, '2025-03-03', 'search'), (1, '2025-03-10', 'search'), (2, '2025-03-10', 'search'), (3, '2025-03-10', 'search'),
    (4, '2025-03-10', 'search'), (1, '2025-03-11', 'search'), (2, '2025-03-11', 'search'), (5, '2025-03-11', 'search'),
    (1, '2025-03-12', 'search'), (2, '2025-03-12', 'search'), (3, '2025-03-12', 'search'),
    (1, '2025-03-10', 'reports'), (6, '2025-03-05', 'reports'), (7, '2025-03-12', 'reports'), (8, '2025-03-20', 'reports'),
    (2, '2025-03-11', 'alerts'), (2, '2025-03-12', 'alerts'), (2, '2025-03-13', 'alerts')
)
SELECT feature, day, user_id
FROM usage
ORDER BY feature, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter to the week first with `day BETWEEN '2025-03-10' AND '2025-03-16'`. Daily users: `COUNT(DISTINCT user_id)` grouped by feature and day.
3. Average over 7 days, not over the days with use: `SUM(daily_users) / 7.0`. Weekly users: `COUNT(DISTINCT user_id)` per feature over the week.

## Solution

```sql
WITH usage(user_id, day, feature) AS (
  VALUES
    (1, '2025-03-03', 'search'), (1, '2025-03-10', 'search'), (2, '2025-03-10', 'search'), (3, '2025-03-10', 'search'),
    (4, '2025-03-10', 'search'), (1, '2025-03-11', 'search'), (2, '2025-03-11', 'search'), (5, '2025-03-11', 'search'),
    (1, '2025-03-12', 'search'), (2, '2025-03-12', 'search'), (3, '2025-03-12', 'search'),
    (1, '2025-03-10', 'reports'), (6, '2025-03-05', 'reports'), (7, '2025-03-12', 'reports'), (8, '2025-03-20', 'reports'),
    (2, '2025-03-11', 'alerts'), (2, '2025-03-12', 'alerts'), (2, '2025-03-13', 'alerts')
),
week AS (
  SELECT * FROM usage WHERE day BETWEEN '2025-03-10' AND '2025-03-16'
),
daily AS (
  SELECT feature, day, COUNT(DISTINCT user_id) AS daily_users FROM week GROUP BY feature, day
),
weekly AS (
  SELECT feature, COUNT(DISTINCT user_id) AS weekly_users FROM week GROUP BY feature
)
SELECT w.feature, w.weekly_users, ROUND(SUM(d.daily_users) / 7.0, 2) AS avg_daily_users,
  ROUND(100.0 * SUM(d.daily_users) / 7.0 / w.weekly_users, 1) AS stickiness_pct
FROM weekly AS w
JOIN daily AS d ON d.feature = w.feature
GROUP BY w.feature, w.weekly_users
ORDER BY stickiness_pct DESC;
```

## Expected result

| feature | weekly_users | avg_daily_users | stickiness_pct |
| --- | --- | --- | --- |
| alerts | 1 | 0.43 | 42.9 |
| search | 5 | 1.43 | 28.6 |
| reports | 2 | 0.29 | 14.3 |

## Explanation

Stickiness compares daily users with weekly users: if everyone who uses a feature in a week uses it every day, the ratio is 100%. Alerts is used by one person, but on three of the seven days (42.9%); search has the most users (5) but each uses it on about two days in seven. Reports is occasional.

The average has to be over all **seven** days. `AVG(daily_users)` over the rows that exist only averages the days when the feature was used, which makes every feature look like it is used daily: alerts would score 100%. Summing the daily users and dividing by 7 counts quiet days as zero. Usage outside the week (search on 3 March, reports on 5 and 20 March) is filtered out first.

**Common mistake:** averaging only over days with use. Quiet days drop out, and occasional features look like daily habits.

## Wrong answers

Feedback: incorrect-output

```sql
WITH usage(user_id, day, feature) AS ( VALUES (1, '2025-03-03', 'search'), (1, '2025-03-10', 'search'), (2, '2025-03-10', 'search'), (3, '2025-03-10', 'search'), (4, '2025-03-10', 'search'), (1, '2025-03-11', 'search'), (2, '2025-03-11', 'search'), (5, '2025-03-11', 'search'), (1, '2025-03-12', 'search'), (2, '2025-03-12', 'search'), (3, '2025-03-12', 'search'), (1, '2025-03-10', 'reports'), (6, '2025-03-05', 'reports'), (7, '2025-03-12', 'reports'), (8, '2025-03-20', 'reports'), (2, '2025-03-11', 'alerts'), (2, '2025-03-12', 'alerts'), (2, '2025-03-13', 'alerts') ), week AS (SELECT * FROM usage WHERE day BETWEEN '2025-03-10' AND '2025-03-16'), daily AS (SELECT feature, day, COUNT(DISTINCT user_id) AS daily_users FROM week GROUP BY feature, day), weekly AS (SELECT feature, COUNT(DISTINCT user_id) AS weekly_users FROM week GROUP BY feature) SELECT w.feature, w.weekly_users, ROUND(AVG(d.daily_users), 2) AS avg_daily_users, ROUND(100.0 * AVG(d.daily_users) / w.weekly_users, 1) AS stickiness_pct FROM weekly AS w JOIN daily AS d ON d.feature = w.feature GROUP BY w.feature, w.weekly_users ORDER BY stickiness_pct DESC;
```
