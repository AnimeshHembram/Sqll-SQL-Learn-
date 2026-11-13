---
id: da-day-246
title: How deep discounts eat into margin
order: 246
difficulty: intermediate
topic: Pricing
summary: Band sales by discount depth and compare revenue, margin and margin rate per band.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Band continuous values
  - Compare margin rates across bands
prerequisites:
  - Day 115
  - Day 155
---

## Task

Each sale (starter query) has a list price, the price it sold for and its unit cost. Band sales by **discount depth** (`(list_price − sold_price) / list_price`): `'none'` (0%), `'1-10%'` (above 0 up to 10%), `'11-25%'` (above 10% up to 25%) and `'over 25%'`.

For each band, return `discount_band`, `sales`, `revenue` (sum of sold prices), `margin` (revenue minus cost) and `margin_pct` (margin ÷ revenue × 100, rounded to 1 decimal place). Sort from no discount to the deepest band.

## Starter query

```sql
WITH sales(sale_id, list_price, sold_price, unit_cost) AS (
  VALUES
    (1, 1000, 1000, 600), (2, 1000, 950, 600), (3, 1000, 900, 600), (4, 1000, 800, 600), (5, 1000, 700, 600),
    (6, 500, 500, 280), (7, 500, 425, 280), (8, 500, 300, 280), (9, 500, 250, 280), (10, 2000, 1900, 1200)
)
SELECT sale_id, list_price, sold_price, unit_cost
FROM sales
ORDER BY sale_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Compute the discount as a fraction with `1.0 * (list_price - sold_price) / list_price` and band it with `CASE`, testing `= 0` first. Keep a numeric sort key next to the label.
3. Margin is `SUM(sold_price - unit_cost)`; the margin rate divides it by `SUM(sold_price)`, so it is weighted by revenue.

## Solution

```sql
WITH sales(sale_id, list_price, sold_price, unit_cost) AS (
  VALUES
    (1, 1000, 1000, 600), (2, 1000, 950, 600), (3, 1000, 900, 600), (4, 1000, 800, 600), (5, 1000, 700, 600),
    (6, 500, 500, 280), (7, 500, 425, 280), (8, 500, 300, 280), (9, 500, 250, 280), (10, 2000, 1900, 1200)
),
banded AS (
  SELECT sold_price, unit_cost,
    CASE WHEN list_price = sold_price THEN 0
         WHEN 1.0 * (list_price - sold_price) / list_price <= 0.10 THEN 1
         WHEN 1.0 * (list_price - sold_price) / list_price <= 0.25 THEN 2
         ELSE 3 END AS band
  FROM sales
)
SELECT CASE band WHEN 0 THEN 'none' WHEN 1 THEN '1-10%' WHEN 2 THEN '11-25%' ELSE 'over 25%' END AS discount_band,
  COUNT(*) AS sales, SUM(sold_price) AS revenue, SUM(sold_price - unit_cost) AS margin,
  ROUND(100.0 * SUM(sold_price - unit_cost) / SUM(sold_price), 1) AS margin_pct
FROM banded
GROUP BY band
ORDER BY band;
```

## Expected result

| discount_band | sales | revenue | margin | margin_pct |
| --- | --- | --- | --- | --- |
| none | 2 | 1500 | 620 | 41.3 |
| 1-10% | 3 | 3750 | 1350 | 36 |
| 11-25% | 2 | 1225 | 345 | 28.2 |
| over 25% | 3 | 1250 | 90 | 7.2 |

## Explanation

Discounts reduce revenue one for one, but they come straight out of margin: a sale at 700 against a list price of 1,000 and a cost of 600 keeps only 100 of margin instead of 400. Banded, the pattern is stark: full-price sales earn a 41.3% margin, while the deepest discounts keep only 7.2%.

Two details make the banding right. The discount must be computed with `1.0 *`, or integer division turns every discount into 0. And the margin rate is `SUM(margin) / SUM(revenue)`, weighted by revenue, not an average of per-sale percentages, which would let the small sales count as much as the big ones. Sale 9 actually sold below cost (250 against 280), a loss that the band total partly hides.

**Common mistake:** dividing integers. `(list_price - sold_price) / list_price` is 0 for every discount below 100%, so all discounted sales end up in the first band.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales(sale_id, list_price, sold_price, unit_cost) AS ( VALUES (1, 1000, 1000, 600), (2, 1000, 950, 600), (3, 1000, 900, 600), (4, 1000, 800, 600), (5, 1000, 700, 600), (6, 500, 500, 280), (7, 500, 425, 280), (8, 500, 300, 280), (9, 500, 250, 280), (10, 2000, 1900, 1200) ), banded AS (SELECT sold_price, unit_cost, CASE WHEN list_price = sold_price THEN 0 WHEN (list_price - sold_price) / list_price <= 0.10 THEN 1 WHEN (list_price - sold_price) / list_price <= 0.25 THEN 2 ELSE 3 END AS band FROM sales) SELECT CASE band WHEN 0 THEN 'none' WHEN 1 THEN '1-10%' WHEN 2 THEN '11-25%' ELSE 'over 25%' END AS discount_band, COUNT(*) AS sales, SUM(sold_price) AS revenue, SUM(sold_price - unit_cost) AS margin, ROUND(100.0 * SUM(sold_price - unit_cost) / SUM(sold_price), 1) AS margin_pct FROM banded GROUP BY band ORDER BY band;
```
