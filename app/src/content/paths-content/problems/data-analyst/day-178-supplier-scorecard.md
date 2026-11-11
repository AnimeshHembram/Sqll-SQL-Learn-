---
id: da-day-178
title: Case study: supplier scorecard
order: 178
difficulty: advanced
topic: Case studies
summary: Score suppliers on on-time-in-full delivery and quality, judging open orders as of a date.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Score suppliers on several weighted measures
  - Judge open orders as of a date
prerequisites:
  - Day 147
  - Day 119
---

## Task

Procurement scores suppliers **as of 2025-03-31** (data in the starter query):

- A purchase order is **OTIF** (on time, in full) if delivered on or before `promised` with `qty_received ≥ qty_ordered`.
- An undelivered order whose promise date has passed counts as **not** OTIF; an undelivered order not yet due is left out.
- `defect_rate_pct` = defects ÷ quantity received, over delivered orders, as a percentage.
- `score` = 0.6 × OTIF % + 0.4 × (100 − defect rate %).

Return `supplier`, `orders` (judged), `otif_pct`, `defect_rate_pct`, `score` (each rounded to 1 decimal place) and `rank` (1 = highest unrounded score). Sort by `rank`.

## Starter query

```sql
WITH purchase_orders(po, supplier, promised, delivered, qty_ordered, qty_received, defects) AS (
  VALUES
    (1, 'Apex', '2025-03-05', '2025-03-04', 100, 100, 1),
    (2, 'Apex', '2025-03-12', '2025-03-12', 200, 190, 0),
    (3, 'Apex', '2025-03-20', '2025-03-19', 150, 150, 3),
    (4, 'Birla', '2025-03-06', '2025-03-08', 80, 80, 0),
    (5, 'Birla', '2025-03-15', '2025-03-14', 120, 125, 0),
    (6, 'Birla', '2025-03-25', NULL, 60, NULL, NULL),
    (7, 'Corex', '2025-03-10', '2025-03-10', 50, 50, 5),
    (8, 'Corex', '2025-04-10', NULL, 70, NULL, NULL),
    (9, 'Corex', '2025-03-18', '2025-03-17', 40, 40, 2)
)
SELECT po, supplier, promised, delivered, qty_ordered, qty_received, defects
FROM purchase_orders
ORDER BY supplier, po;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Judge orders in a CTE: keep `delivered IS NOT NULL OR promised < '2025-03-31'`, and set `otif = CASE WHEN delivered IS NOT NULL AND delivered <= promised AND qty_received >= qty_ordered THEN 1 ELSE 0 END`.
3. Per supplier: `100.0 * AVG(otif)`, and `100.0 * SUM(defects) / SUM(qty_received)` (both sums skip undelivered orders). Combine into the score, then `RANK() OVER (ORDER BY score DESC)`.

## Solution

```sql
WITH purchase_orders(po, supplier, promised, delivered, qty_ordered, qty_received, defects) AS (
  VALUES
    (1, 'Apex', '2025-03-05', '2025-03-04', 100, 100, 1),
    (2, 'Apex', '2025-03-12', '2025-03-12', 200, 190, 0),
    (3, 'Apex', '2025-03-20', '2025-03-19', 150, 150, 3),
    (4, 'Birla', '2025-03-06', '2025-03-08', 80, 80, 0),
    (5, 'Birla', '2025-03-15', '2025-03-14', 120, 125, 0),
    (6, 'Birla', '2025-03-25', NULL, 60, NULL, NULL),
    (7, 'Corex', '2025-03-10', '2025-03-10', 50, 50, 5),
    (8, 'Corex', '2025-04-10', NULL, 70, NULL, NULL),
    (9, 'Corex', '2025-03-18', '2025-03-17', 40, 40, 2)
),
judged AS (
  SELECT supplier, qty_received, defects,
    CASE WHEN delivered IS NOT NULL AND delivered <= promised AND qty_received >= qty_ordered THEN 1 ELSE 0 END AS otif
  FROM purchase_orders
  WHERE delivered IS NOT NULL OR promised < '2025-03-31'
),
per_supplier AS (
  SELECT supplier, COUNT(*) AS orders,
    100.0 * AVG(otif) AS otif_pct,
    100.0 * SUM(defects) / SUM(qty_received) AS defect_rate_pct
  FROM judged
  GROUP BY supplier
),
scored AS (
  SELECT supplier, orders, otif_pct, defect_rate_pct, 0.6 * otif_pct + 0.4 * (100 - defect_rate_pct) AS score FROM per_supplier
)
SELECT supplier, orders, ROUND(otif_pct, 1) AS otif_pct, ROUND(defect_rate_pct, 1) AS defect_rate_pct, ROUND(score, 1) AS score,
  RANK() OVER (ORDER BY score DESC) AS rank
FROM scored
ORDER BY rank;
```

## Expected result

| supplier | orders | otif_pct | defect_rate_pct | score | rank |
| --- | --- | --- | --- | --- | --- |
| Corex | 2 | 100 | 7.8 | 96.9 | 1 |
| Apex | 3 | 66.7 | 0.9 | 79.6 | 2 |
| Birla | 3 | 33.3 | 0 | 60 | 3 |

## Explanation

A scorecard turns several operational measures into one comparable number; agreeing the rules matters more than the arithmetic.

**In full** fails Apex's second order: on time, but 10 units short. **On time** fails Birla's first order, which arrived complete but two days late. Birla's third order was due on 25 March and has not arrived, so it is judged now as a failure. Corex's April order is not due yet and is left out entirely, rather than counted as a pass or a fail.

Corex delivers on time every time but has the worst quality, 7.8% defective. With 60% of the weight on OTIF, Corex still ranks first ahead of Apex; a buyer that cares more about quality would change the weights, which is a business decision, not a SQL one.

**Common mistake:** leaving overdue undelivered orders out of the OTIF calculation, which rewards a supplier for not delivering at all (Birla would jump to 50%).

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchase_orders(po, supplier, promised, delivered, qty_ordered, qty_received, defects) AS ( VALUES (1, 'Apex', '2025-03-05', '2025-03-04', 100, 100, 1), (2, 'Apex', '2025-03-12', '2025-03-12', 200, 190, 0), (3, 'Apex', '2025-03-20', '2025-03-19', 150, 150, 3), (4, 'Birla', '2025-03-06', '2025-03-08', 80, 80, 0), (5, 'Birla', '2025-03-15', '2025-03-14', 120, 125, 0), (6, 'Birla', '2025-03-25', NULL, 60, NULL, NULL), (7, 'Corex', '2025-03-10', '2025-03-10', 50, 50, 5), (8, 'Corex', '2025-04-10', NULL, 70, NULL, NULL), (9, 'Corex', '2025-03-18', '2025-03-17', 40, 40, 2) ), judged AS (SELECT supplier, qty_received, defects, CASE WHEN delivered <= promised AND qty_received >= qty_ordered THEN 1 ELSE 0 END AS otif FROM purchase_orders WHERE delivered IS NOT NULL), per_supplier AS (SELECT supplier, COUNT(*) AS orders, 100.0 * AVG(otif) AS otif_pct, 100.0 * SUM(defects) / SUM(qty_received) AS defect_rate_pct FROM judged GROUP BY supplier), scored AS (SELECT supplier, orders, otif_pct, defect_rate_pct, 0.6 * otif_pct + 0.4 * (100 - defect_rate_pct) AS score FROM per_supplier) SELECT supplier, orders, ROUND(otif_pct, 1) AS otif_pct, ROUND(defect_rate_pct, 1) AS defect_rate_pct, ROUND(score, 1) AS score, RANK() OVER (ORDER BY score DESC) AS rank FROM scored ORDER BY rank;
```
