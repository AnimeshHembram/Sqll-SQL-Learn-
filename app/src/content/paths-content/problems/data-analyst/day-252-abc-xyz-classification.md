---
id: da-day-252
title: ABC-XYZ classification of the range
order: 252
difficulty: advanced
topic: Supply chain
summary: Classify SKUs by cumulative revenue share (ABC) and demand stability (XYZ) in one query.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Classify with a running share
  - Measure variability with the coefficient of variation
prerequisites:
  - Day 135
  - Day 227
---

## Task

Classify each SKU (starter query, four months of units) on two axes:

- **ABC by revenue**: sort SKUs by revenue (units × price) from highest; a SKU is `A` if the running share of revenue **before** it is under 70%, `B` if under 90%, otherwise `C` (so the top seller is always `A`).
- **XYZ by stability**: the coefficient of variation `cv` = population standard deviation of monthly units ÷ mean monthly units; `X` when `cv` ≤ 0.2, `Y` when ≤ 0.5, otherwise `Z`.

Return `sku`, `revenue`, `revenue_share_pct` (rounded to 1 decimal place), `abc`, `cv` (rounded to 2 decimal places), `xyz` and `class` (the two letters together, like `'AX'`). Sort by `revenue` from highest.

## Starter query

```sql
WITH monthly_units(sku, month, units, unit_price) AS (
  VALUES
    ('K1', 1, 100, 50), ('K1', 2, 110, 50), ('K1', 3, 95, 50), ('K1', 4, 105, 50),
    ('K2', 1, 10, 400), ('K2', 2, 60, 400), ('K2', 3, 0, 400), ('K2', 4, 30, 400),
    ('K3', 1, 40, 30), ('K3', 2, 42, 30), ('K3', 3, 38, 30), ('K3', 4, 40, 30),
    ('K4', 1, 5, 20), ('K4', 2, 25, 20), ('K4', 3, 2, 20), ('K4', 4, 8, 20),
    ('K5', 1, 20, 60), ('K5', 2, 30, 60), ('K5', 3, 25, 60), ('K5', 4, 15, 60)
)
SELECT sku, month, units, unit_price
FROM monthly_units
ORDER BY sku, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per SKU: revenue `SUM(units * unit_price)`, mean `AVG(units)` and population variance `AVG(units * units) - AVG(units) * AVG(units)`; `SQRT` of it divided by the mean is `cv`.
3. Running share before each SKU: `SUM(revenue) OVER (ORDER BY revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)`, divided by the total, with `COALESCE(..., 0)` for the first SKU.

## Solution

```sql
WITH monthly_units(sku, month, units, unit_price) AS (
  VALUES
    ('K1', 1, 100, 50), ('K1', 2, 110, 50), ('K1', 3, 95, 50), ('K1', 4, 105, 50),
    ('K2', 1, 10, 400), ('K2', 2, 60, 400), ('K2', 3, 0, 400), ('K2', 4, 30, 400),
    ('K3', 1, 40, 30), ('K3', 2, 42, 30), ('K3', 3, 38, 30), ('K3', 4, 40, 30),
    ('K4', 1, 5, 20), ('K4', 2, 25, 20), ('K4', 3, 2, 20), ('K4', 4, 8, 20),
    ('K5', 1, 20, 60), ('K5', 2, 30, 60), ('K5', 3, 25, 60), ('K5', 4, 15, 60)
),
per_sku AS (
  SELECT sku, SUM(units * unit_price) AS revenue,
    SQRT(AVG(units * units) - AVG(units) * AVG(units)) / AVG(units) AS cv
  FROM monthly_units
  GROUP BY sku
),
running AS (
  SELECT sku, revenue, cv,
    100.0 * revenue / SUM(revenue) OVER () AS share,
    100.0 * COALESCE(SUM(revenue) OVER (ORDER BY revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) / SUM(revenue) OVER () AS share_before
  FROM per_sku
),
classed AS (
  SELECT sku, revenue, share, cv,
    CASE WHEN share_before < 70 THEN 'A' WHEN share_before < 90 THEN 'B' ELSE 'C' END AS abc,
    CASE WHEN cv <= 0.2 THEN 'X' WHEN cv <= 0.5 THEN 'Y' ELSE 'Z' END AS xyz
  FROM running
)
SELECT sku, revenue, ROUND(share, 1) AS revenue_share_pct, abc, ROUND(cv, 2) AS cv, xyz, abc || xyz AS class
FROM classed
ORDER BY revenue DESC;
```

## Expected result

| sku | revenue | revenue_share_pct | abc | cv | xyz | class |
| --- | --- | --- | --- | --- | --- | --- |
| K2 | 40000 | 55.9 | A | 0.92 | Z | AZ |
| K1 | 20500 | 28.7 | A | 0.05 | X | AX |
| K5 | 5400 | 7.6 | B | 0.25 | Y | BY |
| K3 | 4800 | 6.7 | C | 0.04 | X | CX |
| K4 | 800 | 1.1 | C | 0.89 | Z | CZ |

## Explanation

ABC and XYZ answer different questions. ABC is about value: K2 and K1 together bring in 84.6% of revenue. XYZ is about predictability: the coefficient of variation compares the spread of monthly demand with its average, so K1 (cv 0.05) is very steady while K2 (0.92) is erratic. Together they decide planning policy: AX items like K1 suit automatic replenishment, AZ items like K2 need close attention, and CZ items like K4 might be made to order.

The ABC rule uses the share **before** each SKU, so a frame ending at `1 PRECEDING` is needed; with the default frame the top seller's own 55.9% would count against it. K5 falls in B because 84.6% came before it.

**Common mistake:** using the running share including the current SKU. A SKU that crosses the 70% line is pushed into B even though most of its revenue lies below the line; here K1 would become B.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly_units(sku, month, units, unit_price) AS ( VALUES ('K1', 1, 100, 50), ('K1', 2, 110, 50), ('K1', 3, 95, 50), ('K1', 4, 105, 50), ('K2', 1, 10, 400), ('K2', 2, 60, 400), ('K2', 3, 0, 400), ('K2', 4, 30, 400), ('K3', 1, 40, 30), ('K3', 2, 42, 30), ('K3', 3, 38, 30), ('K3', 4, 40, 30), ('K4', 1, 5, 20), ('K4', 2, 25, 20), ('K4', 3, 2, 20), ('K4', 4, 8, 20), ('K5', 1, 20, 60), ('K5', 2, 30, 60), ('K5', 3, 25, 60), ('K5', 4, 15, 60) ), per_sku AS (SELECT sku, SUM(units * unit_price) AS revenue, SQRT(AVG(units * units) - AVG(units) * AVG(units)) / AVG(units) AS cv FROM monthly_units GROUP BY sku), running AS (SELECT sku, revenue, cv, 100.0 * revenue / SUM(revenue) OVER () AS share, 100.0 * SUM(revenue) OVER (ORDER BY revenue DESC) / SUM(revenue) OVER () AS share_before FROM per_sku), classed AS (SELECT sku, revenue, share, cv, CASE WHEN share_before < 70 THEN 'A' WHEN share_before < 90 THEN 'B' ELSE 'C' END AS abc, CASE WHEN cv <= 0.2 THEN 'X' WHEN cv <= 0.5 THEN 'Y' ELSE 'Z' END AS xyz FROM running) SELECT sku, revenue, ROUND(share, 1) AS revenue_share_pct, abc, ROUND(cv, 2) AS cv, xyz, abc || xyz AS class FROM classed ORDER BY revenue DESC;
```
