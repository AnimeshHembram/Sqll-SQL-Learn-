---
id: da-day-174
title: Refresh a summary incrementally
order: 174
difficulty: advanced
topic: Query performance
summary: Rebuild only the days after a watermark, including the partial day, without double counting.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Process data incrementally with a watermark
  - Rebuild partial periods to avoid double counting
prerequisites:
  - Day 106
  - Day 167
---

## Task

A nightly job keeps `daily_summary` up to date. The last run processed raw orders up to the `watermark` timestamp (2025-03-03 12:00:00), so the summary row for 3 March is **partial**. Recomputing everything is too slow on the real table.

Produce the refreshed summary: keep the stored rows for days **before** the watermark's day, and recompute from `raw_orders` every day **from** the watermark's day onwards. Return `day`, `orders` and `revenue` for all days. Sort by `day`.

## Starter query

```sql
WITH daily_summary(day, orders, revenue) AS (
  VALUES ('2025-03-01', 3, 300), ('2025-03-02', 2, 150), ('2025-03-03', 1, 40)
),
raw_orders(id, created_at, amount) AS (
  VALUES
    (1, '2025-03-01 09:00:00', 100), (2, '2025-03-01 12:00:00', 120), (3, '2025-03-01 17:45:00', 80),
    (4, '2025-03-02 10:00:00', 100), (5, '2025-03-02 15:20:00', 50),
    (6, '2025-03-03 08:00:00', 40), (7, '2025-03-03 21:30:00', 60),
    (8, '2025-03-04 11:00:00', 70),
    (9, '2025-03-05 13:00:00', 90), (10, '2025-03-05 14:00:00', 10)
),
watermark(processed_until) AS (
  VALUES ('2025-03-03 12:00:00')
)
SELECT day, orders, revenue FROM daily_summary
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The watermark's day is `date((SELECT processed_until FROM watermark))`. Stored rows: `WHERE day < that day`. Recomputed rows: `WHERE created_at >= that day`, grouped by `date(created_at)`.
3. Combine the two parts with `UNION ALL` in a CTE and sort in the outer query. Each day comes from exactly one part, so nothing is counted twice.

## Solution

```sql
WITH daily_summary(day, orders, revenue) AS (
  VALUES ('2025-03-01', 3, 300), ('2025-03-02', 2, 150), ('2025-03-03', 1, 40)
),
raw_orders(id, created_at, amount) AS (
  VALUES
    (1, '2025-03-01 09:00:00', 100), (2, '2025-03-01 12:00:00', 120), (3, '2025-03-01 17:45:00', 80),
    (4, '2025-03-02 10:00:00', 100), (5, '2025-03-02 15:20:00', 50),
    (6, '2025-03-03 08:00:00', 40), (7, '2025-03-03 21:30:00', 60),
    (8, '2025-03-04 11:00:00', 70),
    (9, '2025-03-05 13:00:00', 90), (10, '2025-03-05 14:00:00', 10)
),
watermark(processed_until) AS (
  VALUES ('2025-03-03 12:00:00')
),
cutoff AS (
  SELECT date(processed_until) AS day FROM watermark
),
refreshed AS (
  SELECT s.day, s.orders, s.revenue
  FROM daily_summary AS s
  WHERE s.day < (SELECT day FROM cutoff)
  UNION ALL
  SELECT date(r.created_at), COUNT(*), SUM(r.amount)
  FROM raw_orders AS r
  WHERE r.created_at >= (SELECT day FROM cutoff)
  GROUP BY date(r.created_at)
)
SELECT day, orders, revenue
FROM refreshed
ORDER BY day;
```

## Expected result

| day | orders | revenue |
| --- | --- | --- |
| 2025-03-01 | 3 | 300 |
| 2025-03-02 | 2 | 150 |
| 2025-03-03 | 2 | 100 |
| 2025-03-04 | 1 | 70 |
| 2025-03-05 | 2 | 100 |

## Explanation

Incremental processing keeps pipelines fast: only new data is read, and the old results are reused. The watermark records how far the last run got; the subtle part is that the run stopped **in the middle of** a day, so that day's stored row is incomplete and must be rebuilt from its first order, not just topped up.

Each output day comes from exactly one source: 1 and 2 March from the summary, and 3 March onwards from the raw rows. The 3 March row becomes 2 orders and 100, including the evening order the last run never saw. The raw table still contains the 1–2 March orders, but the date filter keeps them out, so they are not counted again.

**Common mistake:** appending only orders after the watermark to the existing summary, which leaves the stale 3 March row in place and adds a second 3 March row for the evening order.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_summary(day, orders, revenue) AS ( VALUES ('2025-03-01', 3, 300), ('2025-03-02', 2, 150), ('2025-03-03', 1, 40) ), raw_orders(id, created_at, amount) AS ( VALUES (1, '2025-03-01 09:00:00', 100), (2, '2025-03-01 12:00:00', 120), (3, '2025-03-01 17:45:00', 80), (4, '2025-03-02 10:00:00', 100), (5, '2025-03-02 15:20:00', 50), (6, '2025-03-03 08:00:00', 40), (7, '2025-03-03 21:30:00', 60), (8, '2025-03-04 11:00:00', 70), (9, '2025-03-05 13:00:00', 90), (10, '2025-03-05 14:00:00', 10) ), watermark(processed_until) AS ( VALUES ('2025-03-03 12:00:00') ), refreshed AS (SELECT day, orders, revenue FROM daily_summary UNION ALL SELECT date(r.created_at), COUNT(*), SUM(r.amount) FROM raw_orders AS r WHERE r.created_at > (SELECT processed_until FROM watermark) GROUP BY date(r.created_at)) SELECT day, orders, revenue FROM refreshed ORDER BY day;
```
