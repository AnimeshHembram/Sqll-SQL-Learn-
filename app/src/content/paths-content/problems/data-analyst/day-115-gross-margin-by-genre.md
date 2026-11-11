---
id: da-day-115
title: Gross margin by genre
order: 115
difficulty: advanced
topic: Business analysis
summary: Combine sales with unit costs, and keep lines without a known cost out of the margin.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - order_items
  - orders
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Join cost data and calculate margins
  - Report incomplete data instead of hiding it
prerequisites:
  - Day 113
  - Day 71
---

## Task

Finance has unit costs for most books (in the starter query); *A Quiet Ledger* is new and has **no cost recorded yet**. For each genre, using non-cancelled order lines, return:

- `genre`,
- `revenue` and `cost` of the lines **with** a known cost (each rounded to 2 decimal places),
- `margin_pct`: (revenue − cost) as a percentage of that revenue, rounded to 1 decimal place,
- `uncosted_lines`: how many lines were left out because their book has no cost.

Sort by `margin_pct` from highest to lowest.

## Starter query

```sql
WITH book_costs(book_id, unit_cost) AS (
  VALUES (1, 7.50), (2, 9.00), (3, 6.20), (4, 10.80), (5, 11.50)
)
SELECT book_id, unit_cost
FROM book_costs;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Build one row per non-cancelled order line with its genre, `quantity * unit_price` as revenue and `quantity * unit_cost` as cost, using `LEFT JOIN book_costs` so uncosted lines stay (with a `NULL` cost).
3. Revenue must only include costed lines: `SUM(CASE WHEN cost IS NOT NULL THEN revenue END)`. Count the others with `SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END)`.

## Solution

```sql
WITH book_costs(book_id, unit_cost) AS (
  VALUES (1, 7.50), (2, 9.00), (3, 6.20), (4, 10.80), (5, 11.50)
),
lines AS (
  SELECT b.genre,
    oi.quantity * oi.unit_price AS revenue,
    oi.quantity * c.unit_cost AS cost
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled'
  JOIN books AS b ON b.id = oi.book_id
  LEFT JOIN book_costs AS c ON c.book_id = oi.book_id
),
by_genre AS (
  SELECT genre,
    SUM(CASE WHEN cost IS NOT NULL THEN revenue END) AS revenue,
    SUM(cost) AS cost,
    SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS uncosted_lines
  FROM lines
  GROUP BY genre
)
SELECT genre,
  ROUND(revenue, 2) AS revenue,
  ROUND(cost, 2) AS cost,
  ROUND(100.0 * (revenue - cost) / revenue, 1) AS margin_pct,
  uncosted_lines
FROM by_genre
ORDER BY margin_pct DESC;
```

## Expected result

| genre | revenue | cost | margin_pct | uncosted_lines |
| --- | --- | --- | --- | --- |
| Mystery | 12.99 | 7.5 | 42.3 | 1 |
| Science fiction | 18 | 10.8 | 40 | 0 |
| Science | 29.97 | 18.6 | 37.9 | 0 |
| Fantasy | 57.75 | 38.5 | 33.3 | 0 |

## Explanation

A margin compares revenue with the cost of **the same items**. If uncosted lines kept their revenue while contributing no cost (`SUM` ignores `NULL`), Mystery would look far more profitable than it is. Leaving those lines out of both sides, and reporting how many were left out, keeps the figure honest and shows where the data is incomplete.

Fantasy has the lowest margin partly because *Paper Lanterns* costs 11.50 but sold for 11.25, a loss on every copy. The margin is calculated from the unrounded totals and rounded once at the end.

**Common mistake:** `SUM(revenue)` over all lines with `SUM(cost)` over costed lines, which mixes two different sets of sales.

## Wrong answers

Feedback: incorrect-output

```sql
WITH book_costs(book_id, unit_cost) AS ( VALUES (1, 7.50), (2, 9.00), (3, 6.20), (4, 10.80), (5, 11.50) ), lines AS (SELECT b.genre, oi.quantity * oi.unit_price AS revenue, oi.quantity * c.unit_cost AS cost FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled' JOIN books AS b ON b.id = oi.book_id LEFT JOIN book_costs AS c ON c.book_id = oi.book_id) SELECT genre, ROUND(SUM(revenue), 2) AS revenue, ROUND(SUM(cost), 2) AS cost, ROUND(100.0 * (SUM(revenue) - SUM(cost)) / SUM(revenue), 1) AS margin_pct, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS uncosted_lines FROM lines GROUP BY genre ORDER BY margin_pct DESC;
```
