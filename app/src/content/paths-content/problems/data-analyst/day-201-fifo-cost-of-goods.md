---
id: da-day-201
title: FIFO cost of goods sold
order: 201
difficulty: advanced
topic: Financial analysis
summary: Match sales to purchase lots first-in, first-out by overlapping cumulative quantity ranges.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Allocate quantities FIFO with overlapping ranges
  - Compute cost of goods sold
prerequisites:
  - Day 141
  - Day 100
---

## Task

Stock is used **first in, first out**: each sale takes units from the oldest purchase lot that still has stock, moving to the next lot when one runs out (purchases and sales in the starter query). For each sale, return `sale_id`, `qty`, `cogs` (the cost of the units it took, rounded to 2 decimal places) and `lots_used` (the lots it drew from, joined with `','`). Sort by `sale_id`.

## Starter query

```sql
WITH purchases(lot, bought_on, qty, unit_cost) AS (
  VALUES (1, '2025-01-02', 10, 5.0), (2, '2025-01-10', 5, 6.0), (3, '2025-01-20', 10, 7.0)
),
sales(sale_id, sold_on, qty) AS (
  VALUES (101, '2025-01-12', 8), (102, '2025-01-15', 4), (103, '2025-01-25', 6), (104, '2025-01-28', 4)
)
SELECT lot, bought_on, qty, unit_cost,
  SUM(qty) OVER (ORDER BY bought_on) AS units_bought_to_date
FROM purchases;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Turn both tables into ranges of unit numbers: lot 1 holds units 1–10, lot 2 units 11–15 and so on (`SUM(qty) OVER (ORDER BY ...)` gives each range's end; subtract `qty` for the start). Do the same for the sales.
3. A sale and a lot share units where the ranges overlap: `MIN(sale_end, lot_end) - MAX(sale_start, lot_start)` when positive. Join every sale to every lot, keep positive overlaps, and sum `overlap × unit_cost` per sale.

## Solution

```sql
WITH purchases(lot, bought_on, qty, unit_cost) AS (
  VALUES (1, '2025-01-02', 10, 5.0), (2, '2025-01-10', 5, 6.0), (3, '2025-01-20', 10, 7.0)
),
sales(sale_id, sold_on, qty) AS (
  VALUES (101, '2025-01-12', 8), (102, '2025-01-15', 4), (103, '2025-01-25', 6), (104, '2025-01-28', 4)
),
lot_ranges AS (
  SELECT lot, unit_cost, SUM(qty) OVER (ORDER BY bought_on, lot) - qty AS lot_start, SUM(qty) OVER (ORDER BY bought_on, lot) AS lot_end
  FROM purchases
),
sale_ranges AS (
  SELECT sale_id, qty, SUM(qty) OVER (ORDER BY sold_on, sale_id) - qty AS sale_start, SUM(qty) OVER (ORDER BY sold_on, sale_id) AS sale_end
  FROM sales
),
matches AS (
  SELECT s.sale_id, s.qty, l.lot, l.unit_cost,
    MIN(s.sale_end, l.lot_end) - MAX(s.sale_start, l.lot_start) AS units
  FROM sale_ranges AS s
  JOIN lot_ranges AS l ON l.lot_start < s.sale_end AND s.sale_start < l.lot_end
)
SELECT sale_id, qty, ROUND(SUM(units * unit_cost), 2) AS cogs, group_concat(lot, ',' ORDER BY lot) AS lots_used
FROM matches
GROUP BY sale_id, qty
ORDER BY sale_id;
```

## Expected result

| sale_id | qty | cogs | lots_used |
| --- | --- | --- | --- |
| 101 | 8 | 40 | 1 |
| 102 | 4 | 22 | 1,2 |
| 103 | 6 | 39 | 2,3 |
| 104 | 4 | 28 | 3 |

## Explanation

FIFO costing looks procedural ("take from the oldest lot until it is empty"), but it has a neat set-based form: number every unit bought and every unit sold in order, and each sale consumes exactly the units whose numbers overlap its range. The overlap of two ranges is the smaller end minus the larger start, the same idea as Day 141's overlapping bookings.

Sale 101 takes 8 units at 5.00 from lot 1. Sale 102 takes lot 1's last 2 units and 2 from lot 2: two costs in one sale. Sale 103 takes lot 2's last three units and three from lot 3, and sale 104 stays within lot 3. Ordering by date **and** id makes the numbering deterministic even when two purchases share a date.

**Common mistake:** pricing every sale at the average cost (or at its first lot's cost), which misstates profit whenever prices change between purchases.

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchases(lot, bought_on, qty, unit_cost) AS ( VALUES (1, '2025-01-02', 10, 5.0), (2, '2025-01-10', 5, 6.0), (3, '2025-01-20', 10, 7.0) ), sales(sale_id, sold_on, qty) AS ( VALUES (101, '2025-01-12', 8), (102, '2025-01-15', 4), (103, '2025-01-25', 6), (104, '2025-01-28', 4) ), avg_cost AS (SELECT SUM(qty * unit_cost) / SUM(qty) AS c FROM purchases) SELECT s.sale_id, s.qty, ROUND(s.qty * a.c, 2) AS cogs, '1,2,3' AS lots_used FROM sales AS s CROSS JOIN avg_cost AS a ORDER BY s.sale_id;
```
