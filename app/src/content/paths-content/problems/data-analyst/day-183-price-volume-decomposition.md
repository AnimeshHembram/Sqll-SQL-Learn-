---
id: da-day-183
title: Why did revenue change? Price versus volume
order: 183
difficulty: advanced
topic: Financial analysis
summary: Split each product's revenue change into a volume effect and a price effect that add up exactly.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Decompose a change into additive effects
  - Handle new and discontinued items in a bridge
prerequisites:
  - Day 80
  - Day 162
---

## Task

For each product (in the starter query), last period had quantity `q0` at price `p0`, this period `q1` at `p1`. Explain the revenue change as:

- `volume_effect = (q1 − q0) × p0` (more or fewer units at the old price),
- `price_effect = (p1 − p0) × q1` (the price change on this period's units),

so that `volume_effect + price_effect = revenue_change`. A product sold only this period is `'new'`, only last period `'discontinued'`; for those, the whole change is volume (`price_effect` 0). Return `product`, `status` (`'new'`, `'discontinued'` or `'continuing'`), `revenue_change`, `volume_effect` and `price_effect`, all money rounded to 2 decimal places, plus a final row `'Total'` (status `NULL`). Sort by `product`, with `'Total'` last.

## Starter query

```sql
WITH periods(product, q0, p0, q1, p1) AS (
  VALUES
    ('Pens', 100, 2.0, 120, 2.0),
    ('Mugs', 50, 8.0, 45, 9.0),
    ('Lamps', 10, 40.0, 12, 35.0),
    ('Caps', 30, 6.0, NULL, NULL),
    ('Kites', NULL, NULL, 20, 5.0)
)
SELECT product, q0, p0, q1, p1
FROM periods;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Treat missing quantities as 0 and missing prices as the other period's price: `COALESCE(q0, 0)`, `COALESCE(p0, p1)` and the same for period 1. Then the formulas work for every row.
3. Compute the three columns in a CTE, add the `'Total'` row with `UNION ALL` (summing the effects) and sort with `ORDER BY product = 'Total', product`.

## Solution

```sql
WITH periods(product, q0, p0, q1, p1) AS (
  VALUES
    ('Pens', 100, 2.0, 120, 2.0),
    ('Mugs', 50, 8.0, 45, 9.0),
    ('Lamps', 10, 40.0, 12, 35.0),
    ('Caps', 30, 6.0, NULL, NULL),
    ('Kites', NULL, NULL, 20, 5.0)
),
filled AS (
  SELECT product,
    CASE WHEN q0 IS NULL THEN 'new' WHEN q1 IS NULL THEN 'discontinued' ELSE 'continuing' END AS status,
    COALESCE(q0, 0) AS q0, COALESCE(p0, p1) AS p0, COALESCE(q1, 0) AS q1, COALESCE(p1, p0) AS p1
  FROM periods
),
effects AS (
  SELECT product, status,
    q1 * p1 - q0 * p0 AS revenue_change,
    (q1 - q0) * p0 AS volume_effect,
    (p1 - p0) * q1 AS price_effect
  FROM filled
),
report AS (
  SELECT product, status, revenue_change, volume_effect, price_effect FROM effects
  UNION ALL
  SELECT 'Total', NULL, SUM(revenue_change), SUM(volume_effect), SUM(price_effect) FROM effects
)
SELECT product, status, ROUND(revenue_change, 2) AS revenue_change, ROUND(volume_effect, 2) AS volume_effect, ROUND(price_effect, 2) AS price_effect
FROM report
ORDER BY product = 'Total', product;
```

## Expected result

| product | status | revenue_change | volume_effect | price_effect |
| --- | --- | --- | --- | --- |
| Caps | discontinued | -180 | -180 | 0 |
| Kites | new | 100 | 100 | 0 |
| Lamps | continuing | 20 | 80 | -60 |
| Mugs | continuing | 5 | -40 | 45 |
| Pens | continuing | 40 | 40 | 0 |
| Total | NULL | -15 | 0 | -15 |

## Explanation

A price-volume bridge answers the question behind every "revenue is up" slide: did we sell more, or charge more? Mugs sold 5 fewer units (−40 at the old price) but a 1.00 price rise on 45 units added 45, so revenue rose by 5 despite falling volume. Lamps sold more units but lost 60 to a price cut.

The two effects add up exactly to the change because the price effect uses the **new** quantity: `(q1 − q0)p0 + (p1 − p0)q1 = q1p1 − q0p0`. New and discontinued products are pure volume; filling the missing price with the other period's price makes their price effect 0 automatically, and the totals still reconcile (−15 overall: volume gains cancel out, and Lamps' price cut is the whole decline).

**Common mistake:** using the old quantity in the price effect, `(p1 − p0) × q0`. The two parts then stop adding up to the actual change, and the gap is left unexplained.

## Wrong answers

Feedback: incorrect-output

```sql
WITH periods(product, q0, p0, q1, p1) AS ( VALUES ('Pens', 100, 2.0, 120, 2.0), ('Mugs', 50, 8.0, 45, 9.0), ('Lamps', 10, 40.0, 12, 35.0), ('Caps', 30, 6.0, NULL, NULL), ('Kites', NULL, NULL, 20, 5.0) ), filled AS (SELECT product, CASE WHEN q0 IS NULL THEN 'new' WHEN q1 IS NULL THEN 'discontinued' ELSE 'continuing' END AS status, COALESCE(q0, 0) AS q0, COALESCE(p0, p1) AS p0, COALESCE(q1, 0) AS q1, COALESCE(p1, p0) AS p1 FROM periods), effects AS (SELECT product, status, q1 * p1 - q0 * p0 AS revenue_change, (q1 - q0) * p0 AS volume_effect, (p1 - p0) * q0 AS price_effect FROM filled), report AS (SELECT product, status, revenue_change, volume_effect, price_effect FROM effects UNION ALL SELECT 'Total', NULL, SUM(revenue_change), SUM(volume_effect), SUM(price_effect) FROM effects) SELECT product, status, ROUND(revenue_change, 2) AS revenue_change, ROUND(volume_effect, 2) AS volume_effect, ROUND(price_effect, 2) AS price_effect FROM report ORDER BY product = 'Total', product;
```
