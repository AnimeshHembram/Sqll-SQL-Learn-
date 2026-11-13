---
id: da-day-307
title: Did the free-shipping threshold change basket sizes?
order: 307
difficulty: intermediate
topic: E-commerce
summary: Compare the basket distribution before and after free shipping started at ₹500.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare distributions before and after a change
  - Look for bunching at a threshold
prerequisites:
  - Day 247
  - Day 155
---

## Task

From **1 March 2025** the shop offered free shipping on baskets of **₹500 or more** (orders in the starter query). Compare February with March: for each month, return `month`, `orders`, `avg_basket` (rounded to 2 decimal places), `just_below_pct` (share of orders from 400 to 499), `at_or_above_pct` (share of orders of 500 or more) and `median_basket` (for an even count, the average of the middle two). Round shares to 1 decimal place. Sort by `month`.

## Starter query

```sql
WITH orders(order_id, ordered_on, basket) AS (
  VALUES
    (1, '2025-02-03', 320), (2, '2025-02-05', 410), (3, '2025-02-08', 470), (4, '2025-02-11', 380), (5, '2025-02-15', 520),
    (6, '2025-02-19', 290), (7, '2025-02-24', 450), (8, '2025-03-04', 505), (9, '2025-03-06', 510), (10, '2025-03-09', 330),
    (11, '2025-03-12', 520), (12, '2025-03-15', 545), (13, '2025-03-19', 610), (14, '2025-03-25', 500)
)
SELECT order_id, ordered_on, basket
FROM orders
ORDER BY ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Group by `strftime('%Y-%m', ordered_on)`: `SUM(basket BETWEEN 400 AND 499)` and `SUM(basket >= 500)` give the band counts.
3. Median per month with `ROW_NUMBER()` and `COUNT(*)` partitioned by month, averaging the rows at `(n + 1) / 2` and `(n + 2) / 2`; join it to the monthly totals.

## Solution

```sql
WITH orders(order_id, ordered_on, basket) AS (
  VALUES
    (1, '2025-02-03', 320), (2, '2025-02-05', 410), (3, '2025-02-08', 470), (4, '2025-02-11', 380), (5, '2025-02-15', 520),
    (6, '2025-02-19', 290), (7, '2025-02-24', 450), (8, '2025-03-04', 505), (9, '2025-03-06', 510), (10, '2025-03-09', 330),
    (11, '2025-03-12', 520), (12, '2025-03-15', 545), (13, '2025-03-19', 610), (14, '2025-03-25', 500)
),
labelled AS (
  SELECT strftime('%Y-%m', ordered_on) AS month, basket,
    ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', ordered_on) ORDER BY basket) AS rn,
    COUNT(*) OVER (PARTITION BY strftime('%Y-%m', ordered_on)) AS n
  FROM orders
),
medians AS (
  SELECT month, AVG(basket) AS median_basket FROM labelled WHERE rn IN ((n + 1) / 2, (n + 2) / 2) GROUP BY month
),
totals AS (
  SELECT month, COUNT(*) AS orders, AVG(basket) AS avg_basket, SUM(basket BETWEEN 400 AND 499) AS just_below, SUM(basket >= 500) AS at_or_above
  FROM labelled
  GROUP BY month
)
SELECT t.month, t.orders, ROUND(t.avg_basket, 2) AS avg_basket, ROUND(100.0 * t.just_below / t.orders, 1) AS just_below_pct,
  ROUND(100.0 * t.at_or_above / t.orders, 1) AS at_or_above_pct, m.median_basket
FROM totals AS t
JOIN medians AS m ON m.month = t.month
ORDER BY t.month;
```

## Expected result

| month | orders | avg_basket | just_below_pct | at_or_above_pct | median_basket |
| --- | --- | --- | --- | --- | --- |
| 2025-02 | 7 | 405.71 | 42.9 | 14.3 | 410 |
| 2025-03 | 7 | 502.86 | 0 | 85.7 | 510 |

## Explanation

Thresholds change behaviour: when free shipping starts at 500, shoppers add items to cross it. In February, 43% of orders were just below 500 and only 14% at or above it. In March, nobody stopped in the 400-499 range and 86% reached 500 or more; the median basket rose from 410 to 510.

The median and the band shares show the bunching more clearly than the average. Before concluding the threshold caused it, a real analysis would check that nothing else changed in March (a promotion, a price change) and whether margin rose with basket size, since the shop now pays for shipping.

**Common mistake:** testing `basket > 500`. Baskets of exactly 500 qualify for free shipping, and a shopper who aimed for the threshold, like the March order of exactly 500, is just the case a strict comparison leaves out.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(order_id, ordered_on, basket) AS ( VALUES (1, '2025-02-03', 320), (2, '2025-02-05', 410), (3, '2025-02-08', 470), (4, '2025-02-11', 380), (5, '2025-02-15', 520), (6, '2025-02-19', 290), (7, '2025-02-24', 450), (8, '2025-03-04', 505), (9, '2025-03-06', 510), (10, '2025-03-09', 330), (11, '2025-03-12', 520), (12, '2025-03-15', 545), (13, '2025-03-19', 610), (14, '2025-03-25', 500) ) SELECT strftime('%Y-%m', ordered_on) AS month, COUNT(*) AS orders, ROUND(AVG(basket), 2) AS avg_basket, ROUND(100.0 * SUM(basket BETWEEN 400 AND 499) / COUNT(*), 1) AS just_below_pct, ROUND(100.0 * SUM(basket > 500) / COUNT(*), 1) AS at_or_above_pct, AVG(basket) AS median_basket FROM orders GROUP BY 1 ORDER BY 1;
```
