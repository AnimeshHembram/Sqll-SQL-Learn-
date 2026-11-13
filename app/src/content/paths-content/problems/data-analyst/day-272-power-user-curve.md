---
id: da-day-272
title: The power user curve
order: 272
difficulty: advanced
topic: Product analytics
summary: Show how many users were active on 1-7, 8-14, 15-21 and 22+ days of March, including empty buckets.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct active days
  - Keep empty buckets with a bucket list
prerequisites:
  - Day 136
  - Day 155
---

## Task

The **power user curve** shows how engaged users are: how many were active on few days of the month and how many on most. Using March 2025 activity (starter query; a user can have more than one row on the same day), count each user's **distinct active days**, then bucket them: `'1-7 days'`, `'8-14 days'`, `'15-21 days'`, `'22+ days'`.

Return `bucket`, `users` and `share_pct` (share of active users, rounded to 1 decimal place) for **all four buckets**, including empty ones. Sort from the lowest bucket to the highest.

## Starter query

```sql
WITH RECURSIVE active_days(user_id, day) AS (
  VALUES
    (1, '2025-03-01'), (1, '2025-03-02'), (1, '2025-03-03'), (1, '2025-03-05'), (1, '2025-03-08'), (1, '2025-03-09'),
    (1, '2025-03-12'), (1, '2025-03-15'), (1, '2025-03-18'), (1, '2025-03-20'), (1, '2025-03-22'), (1, '2025-03-25'), (1, '2025-03-26'), (1, '2025-03-27'), (1, '2025-03-28'), (1, '2025-03-29'),
    (2, '2025-03-03'), (2, '2025-03-10'), (2, '2025-03-17'),
    (3, '2025-03-05'),
    (4, '2025-03-02'), (4, '2025-03-04'), (4, '2025-03-06'), (4, '2025-03-11'), (4, '2025-03-13'), (4, '2025-03-19'), (4, '2025-03-21'), (4, '2025-03-24'),
    (5, '2025-03-07'), (5, '2025-03-21'),
    (6, '2025-03-01'), (6, '2025-03-01'), (6, '2025-03-09'), (6, '2025-03-14'), (6, '2025-03-16'), (6, '2025-03-18'), (6, '2025-03-20'), (6, '2025-03-23'),
    (7, '2025-03-28')
)
SELECT user_id, day
FROM active_days
ORDER BY user_id, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Write the four buckets as `VALUES` so empty buckets still appear.
2. Per user, `COUNT(DISTINCT day)`, then a bucket number: `CASE WHEN days >= 22 THEN 4 WHEN days >= 15 THEN 3 WHEN days >= 8 THEN 2 ELSE 1 END`.
3. `LEFT JOIN` the bucket list to the counted users and `COUNT(u.user_id)`; the share divides by the total number of active users.

## Solution

```sql
WITH RECURSIVE active_days(user_id, day) AS (
  VALUES
    (1, '2025-03-01'), (1, '2025-03-02'), (1, '2025-03-03'), (1, '2025-03-05'), (1, '2025-03-08'), (1, '2025-03-09'),
    (1, '2025-03-12'), (1, '2025-03-15'), (1, '2025-03-18'), (1, '2025-03-20'), (1, '2025-03-22'), (1, '2025-03-25'), (1, '2025-03-26'), (1, '2025-03-27'), (1, '2025-03-28'), (1, '2025-03-29'),
    (2, '2025-03-03'), (2, '2025-03-10'), (2, '2025-03-17'),
    (3, '2025-03-05'),
    (4, '2025-03-02'), (4, '2025-03-04'), (4, '2025-03-06'), (4, '2025-03-11'), (4, '2025-03-13'), (4, '2025-03-19'), (4, '2025-03-21'), (4, '2025-03-24'),
    (5, '2025-03-07'), (5, '2025-03-21'),
    (6, '2025-03-01'), (6, '2025-03-01'), (6, '2025-03-09'), (6, '2025-03-14'), (6, '2025-03-16'), (6, '2025-03-18'), (6, '2025-03-20'), (6, '2025-03-23'),
    (7, '2025-03-28')
),
buckets(bucket_no, bucket) AS (
  VALUES (1, '1-7 days'), (2, '8-14 days'), (3, '15-21 days'), (4, '22+ days')
),
per_user AS (
  SELECT user_id, COUNT(DISTINCT day) AS days FROM active_days GROUP BY user_id
),
bucketed AS (
  SELECT user_id, CASE WHEN days >= 22 THEN 4 WHEN days >= 15 THEN 3 WHEN days >= 8 THEN 2 ELSE 1 END AS bucket_no FROM per_user
)
SELECT b.bucket, COUNT(u.user_id) AS users, ROUND(100.0 * COUNT(u.user_id) / (SELECT COUNT(*) FROM per_user), 1) AS share_pct
FROM buckets AS b
LEFT JOIN bucketed AS u ON u.bucket_no = b.bucket_no
GROUP BY b.bucket_no, b.bucket
ORDER BY b.bucket_no;
```

## Expected result

| bucket | users | share_pct |
| --- | --- | --- |
| 1-7 days | 5 | 71.4 |
| 8-14 days | 1 | 14.3 |
| 15-21 days | 1 | 14.3 |
| 22+ days | 0 | 0 |

## Explanation

The power user curve, popularised by product analytics teams, shows how many users came back on how many days. A healthy product has a bump at the right end (people using it most days); this one is heavily skewed to the left: five of seven active users came on 7 days or fewer, and nobody used it on 22 or more days.

Two details matter. Active days are **distinct** days: user 6 has two rows on 1 March but was active on 7 days, not 8, which keeps them in the lowest bucket. And the curve needs every bucket, including empty ones, or a chart would silently drop the "22+ days" bar that shows the product has no daily users yet. Listing the buckets with `VALUES` and joining users to them keeps all four.

**Common mistake:** grouping users by their bucket label directly. Empty buckets disappear, and the curve loses exactly the part that matters most.

## Wrong answers

Feedback: missing-rows

```sql
WITH RECURSIVE active_days(user_id, day) AS ( VALUES (1, '2025-03-01'), (1, '2025-03-02'), (1, '2025-03-03'), (1, '2025-03-05'), (1, '2025-03-08'), (1, '2025-03-09'), (1, '2025-03-12'), (1, '2025-03-15'), (1, '2025-03-18'), (1, '2025-03-20'), (1, '2025-03-22'), (1, '2025-03-25'), (1, '2025-03-26'), (1, '2025-03-27'), (1, '2025-03-28'), (1, '2025-03-29'), (2, '2025-03-03'), (2, '2025-03-10'), (2, '2025-03-17'), (3, '2025-03-05'), (4, '2025-03-02'), (4, '2025-03-04'), (4, '2025-03-06'), (4, '2025-03-11'), (4, '2025-03-13'), (4, '2025-03-19'), (4, '2025-03-21'), (4, '2025-03-24'), (5, '2025-03-07'), (5, '2025-03-21'), (6, '2025-03-01'), (6, '2025-03-01'), (6, '2025-03-09'), (6, '2025-03-14'), (6, '2025-03-16'), (6, '2025-03-18'), (6, '2025-03-20'), (6, '2025-03-23'), (7, '2025-03-28') ), per_user AS (SELECT user_id, COUNT(DISTINCT day) AS days FROM active_days GROUP BY user_id) SELECT CASE WHEN days >= 22 THEN '22+ days' WHEN days >= 15 THEN '15-21 days' WHEN days >= 8 THEN '8-14 days' ELSE '1-7 days' END AS bucket, COUNT(*) AS users, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM per_user), 1) AS share_pct FROM per_user GROUP BY 1 ORDER BY MIN(days);
```

Feedback: incorrect-output

```sql
WITH RECURSIVE active_days(user_id, day) AS ( VALUES (1, '2025-03-01'), (1, '2025-03-02'), (1, '2025-03-03'), (1, '2025-03-05'), (1, '2025-03-08'), (1, '2025-03-09'), (1, '2025-03-12'), (1, '2025-03-15'), (1, '2025-03-18'), (1, '2025-03-20'), (1, '2025-03-22'), (1, '2025-03-25'), (1, '2025-03-26'), (1, '2025-03-27'), (1, '2025-03-28'), (1, '2025-03-29'), (2, '2025-03-03'), (2, '2025-03-10'), (2, '2025-03-17'), (3, '2025-03-05'), (4, '2025-03-02'), (4, '2025-03-04'), (4, '2025-03-06'), (4, '2025-03-11'), (4, '2025-03-13'), (4, '2025-03-19'), (4, '2025-03-21'), (4, '2025-03-24'), (5, '2025-03-07'), (5, '2025-03-21'), (6, '2025-03-01'), (6, '2025-03-01'), (6, '2025-03-09'), (6, '2025-03-14'), (6, '2025-03-16'), (6, '2025-03-18'), (6, '2025-03-20'), (6, '2025-03-23'), (7, '2025-03-28') ), buckets(bucket_no, bucket) AS (VALUES (1, '1-7 days'), (2, '8-14 days'), (3, '15-21 days'), (4, '22+ days')), per_user AS (SELECT user_id, COUNT(day) AS days FROM active_days GROUP BY user_id), bucketed AS (SELECT user_id, CASE WHEN days >= 22 THEN 4 WHEN days >= 15 THEN 3 WHEN days >= 8 THEN 2 ELSE 1 END AS bucket_no FROM per_user) SELECT b.bucket, COUNT(u.user_id) AS users, ROUND(100.0 * COUNT(u.user_id) / (SELECT COUNT(*) FROM per_user), 1) AS share_pct FROM buckets AS b LEFT JOIN bucketed AS u ON u.bucket_no = b.bucket_no GROUP BY b.bucket_no, b.bucket ORDER BY b.bucket_no;
```
