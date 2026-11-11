---
id: da-day-151
title: Outliers beyond the quartile fences
order: 151
difficulty: advanced
topic: Statistics
summary: Find quartiles by position, build Tukey fences and flag values outside them for each group.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute quartiles with the nearest-rank rule
  - Flag outliers with quartile fences
prerequisites:
  - Day 84
  - Day 143
---

## Task

Operations wants unusual delivery times per region (data in the starter query). For each region, ignore rows with no time yet (`NULL`), sort the times from fastest to slowest and use the **nearest-rank** rule: with `n` times, the first quartile `Q1` is the value at position `ceil(0.25 × n)` and the third quartile `Q3` is the value at position `ceil(0.75 × n)`. The fences are `Q1 − 1.5 × (Q3 − Q1)` and `Q3 + 1.5 × (Q3 − Q1)`.

Return every delivery **strictly outside** its region's fences: `region`, `order_id`, `minutes`, `lower_fence` and `upper_fence`. Sort by `region`, then `order_id`.

## Starter query

```sql
WITH deliveries(region, order_id, minutes) AS (
  VALUES
    ('North', 1, 30), ('North', 2, 32), ('North', 3, 35), ('North', 4, 35), ('North', 5, 36),
    ('North', 6, 38), ('North', 7, 40), ('North', 8, 41), ('North', 9, 95),
    ('South', 10, 20), ('South', 11, 22), ('South', 12, 22), ('South', 13, 23),
    ('South', 14, 24), ('South', 15, 25), ('South', 16, 26), ('South', 17, 5),
    ('East', 18, 50), ('East', 19, 50), ('East', 20, 50), ('East', 21, 50),
    ('West', 22, 10), ('West', 23, NULL), ('West', 24, 12), ('West', 25, 14), ('West', 26, 15), ('West', 27, 60)
)
SELECT region, order_id, minutes
FROM deliveries
ORDER BY region, minutes;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number each region's non-`NULL` times with `ROW_NUMBER() OVER (PARTITION BY region ORDER BY minutes, order_id)` and count them with `COUNT(*) OVER (PARTITION BY region)`, after filtering `minutes IS NOT NULL`.
3. In a CTE per region, `Q1 = MAX(CASE WHEN position = ceil(0.25 * n) THEN minutes END)` and the same for `Q3`. Join it back and keep `minutes < lower_fence OR minutes > upper_fence`.

## Solution

```sql
WITH deliveries(region, order_id, minutes) AS (
  VALUES
    ('North', 1, 30), ('North', 2, 32), ('North', 3, 35), ('North', 4, 35), ('North', 5, 36),
    ('North', 6, 38), ('North', 7, 40), ('North', 8, 41), ('North', 9, 95),
    ('South', 10, 20), ('South', 11, 22), ('South', 12, 22), ('South', 13, 23),
    ('South', 14, 24), ('South', 15, 25), ('South', 16, 26), ('South', 17, 5),
    ('East', 18, 50), ('East', 19, 50), ('East', 20, 50), ('East', 21, 50),
    ('West', 22, 10), ('West', 23, NULL), ('West', 24, 12), ('West', 25, 14), ('West', 26, 15), ('West', 27, 60)
),
ranked AS (
  SELECT region, order_id, minutes,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY minutes, order_id) AS position,
    COUNT(*) OVER (PARTITION BY region) AS n
  FROM deliveries
  WHERE minutes IS NOT NULL
),
quartiles AS (
  SELECT region,
    MAX(CASE WHEN position = ceil(0.25 * n) THEN minutes END) AS q1,
    MAX(CASE WHEN position = ceil(0.75 * n) THEN minutes END) AS q3
  FROM ranked
  GROUP BY region
),
fences AS (
  SELECT region, q1 - 1.5 * (q3 - q1) AS lower_fence, q3 + 1.5 * (q3 - q1) AS upper_fence FROM quartiles
)
SELECT r.region, r.order_id, r.minutes, f.lower_fence, f.upper_fence
FROM ranked AS r
JOIN fences AS f ON f.region = r.region
WHERE r.minutes < f.lower_fence OR r.minutes > f.upper_fence
ORDER BY r.region, r.order_id;
```

## Expected result

| region | order_id | minutes | lower_fence | upper_fence |
| --- | --- | --- | --- | --- |
| North | 9 | 95 | 27.5 | 47.5 |
| South | 17 | 5 | 14 | 30 |
| West | 27 | 60 | 7.5 | 19.5 |

## Explanation

Quartile fences (Tukey's rule) flag outliers without assuming a bell-shaped distribution, and unlike a mean and standard deviation they are not dragged around by the outliers themselves. North's 95-minute delivery sits far above a fence of 47.5, and South's 5 minutes is flagged below its lower fence of 14: probably a data error worth checking.

Two edge cases decide the answer. West's undelivered order (`NULL`) must be left out **before** counting, otherwise the positions shift. East's times are all 50, so the quartiles are equal, both fences are 50 and nothing lies strictly outside.

**Common mistakes:** counting `NULL` rows in `n`, and using `<=`/`>=`, which flags every East delivery.

## Wrong answers

Feedback: incorrect-output

```sql
WITH deliveries(region, order_id, minutes) AS ( VALUES ('North', 1, 30), ('North', 2, 32), ('North', 3, 35), ('North', 4, 35), ('North', 5, 36), ('North', 6, 38), ('North', 7, 40), ('North', 8, 41), ('North', 9, 95), ('South', 10, 20), ('South', 11, 22), ('South', 12, 22), ('South', 13, 23), ('South', 14, 24), ('South', 15, 25), ('South', 16, 26), ('South', 17, 5), ('East', 18, 50), ('East', 19, 50), ('East', 20, 50), ('East', 21, 50), ('West', 22, 10), ('West', 23, NULL), ('West', 24, 12), ('West', 25, 14), ('West', 26, 15), ('West', 27, 60) ), ranked AS (SELECT region, order_id, minutes, ROW_NUMBER() OVER (PARTITION BY region ORDER BY minutes, order_id) AS position, COUNT(*) OVER (PARTITION BY region) AS n FROM deliveries), quartiles AS (SELECT region, MAX(CASE WHEN position = ceil(0.25 * n) THEN minutes END) AS q1, MAX(CASE WHEN position = ceil(0.75 * n) THEN minutes END) AS q3 FROM ranked GROUP BY region), fences AS (SELECT region, q1 - 1.5 * (q3 - q1) AS lower_fence, q3 + 1.5 * (q3 - q1) AS upper_fence FROM quartiles) SELECT r.region, r.order_id, r.minutes, f.lower_fence, f.upper_fence FROM ranked AS r JOIN fences AS f ON f.region = r.region WHERE r.minutes < f.lower_fence OR r.minutes > f.upper_fence ORDER BY r.region, r.order_id;
```

Feedback: extra-rows

```sql
WITH deliveries(region, order_id, minutes) AS ( VALUES ('North', 1, 30), ('North', 2, 32), ('North', 3, 35), ('North', 4, 35), ('North', 5, 36), ('North', 6, 38), ('North', 7, 40), ('North', 8, 41), ('North', 9, 95), ('South', 10, 20), ('South', 11, 22), ('South', 12, 22), ('South', 13, 23), ('South', 14, 24), ('South', 15, 25), ('South', 16, 26), ('South', 17, 5), ('East', 18, 50), ('East', 19, 50), ('East', 20, 50), ('East', 21, 50), ('West', 22, 10), ('West', 23, NULL), ('West', 24, 12), ('West', 25, 14), ('West', 26, 15), ('West', 27, 60) ), ranked AS (SELECT region, order_id, minutes, ROW_NUMBER() OVER (PARTITION BY region ORDER BY minutes, order_id) AS position, COUNT(*) OVER (PARTITION BY region) AS n FROM deliveries WHERE minutes IS NOT NULL), quartiles AS (SELECT region, MAX(CASE WHEN position = ceil(0.25 * n) THEN minutes END) AS q1, MAX(CASE WHEN position = ceil(0.75 * n) THEN minutes END) AS q3 FROM ranked GROUP BY region), fences AS (SELECT region, q1 - 1.5 * (q3 - q1) AS lower_fence, q3 + 1.5 * (q3 - q1) AS upper_fence FROM quartiles) SELECT r.region, r.order_id, r.minutes, f.lower_fence, f.upper_fence FROM ranked AS r JOIN fences AS f ON f.region = r.region WHERE r.minutes <= f.lower_fence OR r.minutes >= f.upper_fence ORDER BY r.region, r.order_id;
```
