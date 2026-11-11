---
id: da-day-155
title: A histogram that shows the gaps
order: 155
difficulty: intermediate
topic: Statistics
summary: Bucket values into fixed-width bins, keep empty bins and add cumulative percentages.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Bin values into fixed-width ranges
  - Keep empty categories with a generated list
prerequisites:
  - Day 74
  - Day 127
---

## Task

Build a histogram of order values (in the starter query) in bins 20 wide: `0` (0 to under 20), `20`, `40`, `60` and `80`, plus a last bin `100` for **100 and over**. Values exactly on an edge belong to the higher bin (20.00 is in the `20` bin). Orders without a value are left out.

Return every bin, including empty ones: `bin_start`, `label` (`'0–19.99'`, `'20–39.99'`, …, `'80–99.99'`, `'100+'`), `orders`, `pct` (share of orders with a value, rounded to 1 decimal place) and `cumulative_pct` (rounded to 1 decimal place). Sort by `bin_start`.

## Starter query

```sql
WITH RECURSIVE order_values(order_id, amount) AS (
  VALUES (1, 5), (2, 12.5), (3, 19.99), (4, 20), (5, 21), (6, 35), (7, 39.99),
         (8, 61), (9, 75), (10, 79.5), (11, 140), (12, 100), (13, NULL)
)
SELECT order_id, amount
FROM order_values
ORDER BY amount;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Generate the bins: `bins(bin_start) AS (SELECT 0 UNION ALL SELECT bin_start + 20 FROM bins WHERE bin_start < 100)`. Each order's bin is `MIN(CAST(amount / 20 AS INTEGER) * 20, 100)`.
3. `LEFT JOIN` the binned orders to the bins and count them; then `SUM(orders) OVER (ORDER BY bin_start)` for the running total. Label with `CASE WHEN bin_start = 100 THEN '100+' ELSE bin_start || '–' || (bin_start + 19) || '.99' END` (adding 19.99 directly would show floating-point noise such as 39.989999…).

## Solution

```sql
WITH RECURSIVE order_values(order_id, amount) AS (
  VALUES (1, 5), (2, 12.5), (3, 19.99), (4, 20), (5, 21), (6, 35), (7, 39.99),
         (8, 61), (9, 75), (10, 79.5), (11, 140), (12, 100), (13, NULL)
),
bins(bin_start) AS (
  SELECT 0
  UNION ALL
  SELECT bin_start + 20 FROM bins WHERE bin_start < 100
),
binned AS (
  SELECT MIN(CAST(amount / 20 AS INTEGER) * 20, 100) AS bin_start FROM order_values WHERE amount IS NOT NULL
),
counts AS (
  SELECT b.bin_start, COUNT(x.bin_start) AS orders
  FROM bins AS b
  LEFT JOIN binned AS x ON x.bin_start = b.bin_start
  GROUP BY b.bin_start
)
SELECT bin_start,
  CASE WHEN bin_start = 100 THEN '100+' ELSE bin_start || '–' || (bin_start + 19) || '.99' END AS label,
  orders,
  ROUND(100.0 * orders / (SELECT COUNT(*) FROM binned), 1) AS pct,
  ROUND(100.0 * SUM(orders) OVER (ORDER BY bin_start) / (SELECT COUNT(*) FROM binned), 1) AS cumulative_pct
FROM counts
ORDER BY bin_start;
```

## Expected result

| bin_start | label | orders | pct | cumulative_pct |
| --- | --- | --- | --- | --- |
| 0 | 0–19.99 | 3 | 25 | 25 |
| 20 | 20–39.99 | 4 | 33.3 | 58.3 |
| 40 | 40–59.99 | 0 | 0 | 58.3 |
| 60 | 60–79.99 | 3 | 25 | 83.3 |
| 80 | 80–99.99 | 0 | 0 | 83.3 |
| 100 | 100+ | 2 | 16.7 | 100 |

## Explanation

A histogram that skips empty bins is misleading: the 40 and 80 bins show the gap in the middle of the price range, and the chart's x-axis stays evenly spaced. Generating the bins first and joining the data to them guarantees every bin appears.

`CAST(amount / 20 AS INTEGER) * 20` floors each value to its bin, so 19.99 goes to 0 and 20 goes to 20. `MIN(..., 100)` puts 100 and 140 into the open-ended last bin. `COUNT(x.bin_start)` counts only matched orders, so empty bins show 0 rather than 1, and the missing value is excluded from both the counts and the denominator.

**Common mistake:** `GROUP BY` the computed bin alone, which silently drops the empty bins.

## Wrong answers

Feedback: missing-rows

```sql
WITH RECURSIVE order_values(order_id, amount) AS ( VALUES (1, 5), (2, 12.5), (3, 19.99), (4, 20), (5, 21), (6, 35), (7, 39.99), (8, 61), (9, 75), (10, 79.5), (11, 140), (12, 100), (13, NULL) ), binned AS (SELECT MIN(CAST(amount / 20 AS INTEGER) * 20, 100) AS bin_start FROM order_values WHERE amount IS NOT NULL), counts AS (SELECT bin_start, COUNT(*) AS orders FROM binned GROUP BY bin_start) SELECT bin_start, CASE WHEN bin_start = 100 THEN '100+' ELSE bin_start || '–' || (bin_start + 19) || '.99' END AS label, orders, ROUND(100.0 * orders / (SELECT COUNT(*) FROM binned), 1) AS pct, ROUND(100.0 * SUM(orders) OVER (ORDER BY bin_start) / (SELECT COUNT(*) FROM binned), 1) AS cumulative_pct FROM counts ORDER BY bin_start;
```
