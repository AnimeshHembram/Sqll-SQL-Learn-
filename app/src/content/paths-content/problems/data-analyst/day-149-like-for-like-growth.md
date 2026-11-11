---
id: da-day-149
title: Case study: like-for-like sales growth
order: 149
difficulty: advanced
topic: Case studies
summary: Separate genuine growth from store openings and closures, with total rows built by UNION ALL.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Define a comparable base for growth
  - Add total rows with UNION ALL and a sort key
prerequisites:
  - Day 108
  - Day 90
---

## Task

Retail reports **like-for-like (LFL)** growth: March 2025 against March 2024, counting only stores that traded for the **whole month in both years** (opened before 2024-03-01 and not closed before 2025-04-01). Data is in the starter query.

Return one row per store, then two total rows, with `label`, `rev_2024`, `rev_2025`, `growth_pct` (rounded to 1 decimal place, `NULL` when there is no 2024 figure) and `like_for_like` (`'yes'` or `'no'`):

- each store (`label` = store),
- `'All stores'`: totals over every store, `like_for_like` = `'no'`,
- `'Like-for-like'`: totals over LFL stores only, `like_for_like` = `'yes'`.

Order: the stores by name, then `'All stores'`, then `'Like-for-like'`.

## Starter query

```sql
WITH stores(store, opened_on, closed_on) AS (
  VALUES
    ('S1', '2019-05-01', NULL), ('S2', '2020-01-10', NULL), ('S3', '2024-03-15', NULL),
    ('S4', '2018-07-01', '2025-03-20'), ('S5', '2024-09-01', NULL)
),
march_sales(store, month, revenue) AS (
  VALUES
    ('S1', '2024-03', 1000), ('S2', '2024-03', 800), ('S3', '2024-03', 300), ('S4', '2024-03', 600),
    ('S1', '2025-03', 1100), ('S2', '2025-03', 760), ('S3', '2025-03', 700), ('S4', '2025-03', 200), ('S5', '2025-03', 500)
)
SELECT store, month, revenue
FROM march_sales
ORDER BY store, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. One row per store with both years: `SUM(CASE WHEN month = '2024-03' THEN revenue END)` and the same for 2025, joined to `stores` to decide `lfl` with `opened_on < '2024-03-01' AND (closed_on IS NULL OR closed_on >= '2025-04-01')`.
3. Build the three parts with `UNION ALL` and a hidden sort column (1 for stores, 2 and 3 for the totals); select from that in an outer query and `ORDER BY sort_key, label`. Growth: `ROUND(100.0 * (rev_2025 - rev_2024) / rev_2024, 1)`.

## Solution

```sql
WITH stores(store, opened_on, closed_on) AS (
  VALUES
    ('S1', '2019-05-01', NULL), ('S2', '2020-01-10', NULL), ('S3', '2024-03-15', NULL),
    ('S4', '2018-07-01', '2025-03-20'), ('S5', '2024-09-01', NULL)
),
march_sales(store, month, revenue) AS (
  VALUES
    ('S1', '2024-03', 1000), ('S2', '2024-03', 800), ('S3', '2024-03', 300), ('S4', '2024-03', 600),
    ('S1', '2025-03', 1100), ('S2', '2025-03', 760), ('S3', '2025-03', 700), ('S4', '2025-03', 200), ('S5', '2025-03', 500)
),
per_store AS (
  SELECT s.store,
    SUM(CASE WHEN m.month = '2024-03' THEN m.revenue END) AS rev_2024,
    SUM(CASE WHEN m.month = '2025-03' THEN m.revenue END) AS rev_2025,
    CASE WHEN s.opened_on < '2024-03-01' AND (s.closed_on IS NULL OR s.closed_on >= '2025-04-01') THEN 'yes' ELSE 'no' END AS lfl
  FROM stores AS s
  LEFT JOIN march_sales AS m ON m.store = s.store
  GROUP BY s.store, s.opened_on, s.closed_on
),
report AS (
  SELECT 1 AS sort_key, store AS label, rev_2024, rev_2025, lfl FROM per_store
  UNION ALL
  SELECT 2, 'All stores', SUM(rev_2024), SUM(rev_2025), 'no' FROM per_store
  UNION ALL
  SELECT 3, 'Like-for-like', SUM(rev_2024), SUM(rev_2025), 'yes' FROM per_store WHERE lfl = 'yes'
)
SELECT label, rev_2024, rev_2025,
  ROUND(100.0 * (rev_2025 - rev_2024) / rev_2024, 1) AS growth_pct,
  lfl AS like_for_like
FROM report
ORDER BY sort_key, label;
```

## Expected result

| label | rev_2024 | rev_2025 | growth_pct | like_for_like |
| --- | --- | --- | --- | --- |
| S1 | 1000 | 1100 | 10 | yes |
| S2 | 800 | 760 | -5 | yes |
| S3 | 300 | 700 | 133.3 | no |
| S4 | 600 | 200 | -66.7 | no |
| S5 | NULL | 500 | NULL | no |
| All stores | 2700 | 3260 | 20.7 | no |
| Like-for-like | 1800 | 1860 | 3.3 | yes |

## Explanation

Total sales grew 20.7%, which sounds excellent, but much of it comes from S5 (new) and S3 (open for only half of March 2024). Comparing only stores that traded fully in both periods, growth is 3.3%: that is the **like-for-like** figure that tells whether the existing business is improving. S4 closed on 20 March 2025, so its fall is not counted against the comparable stores either.

The totals are built with `UNION ALL`, and a hidden `sort_key` keeps them below the store rows regardless of their labels. `SUM` ignores S5's missing 2024 figure, and S5's own growth is `NULL` because there is nothing to grow from.

**Common mistakes:** reporting total growth as if it were LFL; and deciding LFL by "had sales in both months", which wrongly includes S3 and S4 even though they did not trade for both full months.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, opened_on, closed_on) AS ( VALUES ('S1', '2019-05-01', NULL), ('S2', '2020-01-10', NULL), ('S3', '2024-03-15', NULL), ('S4', '2018-07-01', '2025-03-20'), ('S5', '2024-09-01', NULL) ), march_sales(store, month, revenue) AS ( VALUES ('S1', '2024-03', 1000), ('S2', '2024-03', 800), ('S3', '2024-03', 300), ('S4', '2024-03', 600), ('S1', '2025-03', 1100), ('S2', '2025-03', 760), ('S3', '2025-03', 700), ('S4', '2025-03', 200), ('S5', '2025-03', 500) ), per_store AS (SELECT s.store, SUM(CASE WHEN m.month = '2024-03' THEN m.revenue END) AS rev_2024, SUM(CASE WHEN m.month = '2025-03' THEN m.revenue END) AS rev_2025, CASE WHEN SUM(CASE WHEN m.month = '2024-03' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN m.month = '2025-03' THEN 1 ELSE 0 END) > 0 THEN 'yes' ELSE 'no' END AS lfl FROM stores AS s LEFT JOIN march_sales AS m ON m.store = s.store GROUP BY s.store), report AS (SELECT 1 AS sort_key, store AS label, rev_2024, rev_2025, lfl FROM per_store UNION ALL SELECT 2, 'All stores', SUM(rev_2024), SUM(rev_2025), 'no' FROM per_store UNION ALL SELECT 3, 'Like-for-like', SUM(rev_2024), SUM(rev_2025), 'yes' FROM per_store WHERE lfl = 'yes') SELECT label, rev_2024, rev_2025, ROUND(100.0 * (rev_2025 - rev_2024) / rev_2024, 1) AS growth_pct, lfl AS like_for_like FROM report ORDER BY sort_key, label;
```
