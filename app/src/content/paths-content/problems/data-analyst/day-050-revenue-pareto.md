---
id: da-day-050
title: Which books make most of the money?
order: 50
difficulty: advanced
topic: Metrics
summary: Build a Pareto table: revenue per book with a cumulative percentage.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate a cumulative percentage
  - Use an empty OVER () for a grand total
prerequisites:
  - Day 40
  - Day 42
---

## Task

Rank sold books by revenue (non-cancelled orders) and show how quickly the total builds up. Return `title`, `revenue` (rounded to 2 decimal places) and `cumulative_pct`: the running total of revenue as a percentage of all revenue, rounded to 1 decimal place. Sort by `revenue`, highest first.

## Starter query

```sql
SELECT b.title, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY b.id, b.title
ORDER BY revenue DESC;
```

## Hints

1. You need two windows: a running total ordered by revenue, and the grand total over all rows.
2. `SUM(revenue) OVER (ORDER BY revenue DESC)` is the running total; `SUM(revenue) OVER ()` is the total of every row.
3. Put the starter query in a CTE and return `ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC) / SUM(revenue) OVER (), 1) AS cumulative_pct`.

## Solution

```sql
WITH book_revenue AS (
  SELECT b.title, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY b.id, b.title
)
SELECT title, ROUND(revenue, 2) AS revenue,
  ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC) / SUM(revenue) OVER (), 1) AS cumulative_pct
FROM book_revenue
ORDER BY revenue DESC;
```

## Expected result

| title | revenue | cumulative_pct |
| --- | --- | --- |
| Rivers of Glass | 46.5 | 34.8 |
| Counting Stars | 29.97 | 57.3 |
| The Last Signal | 18 | 70.8 |
| A Quiet Ledger | 14.75 | 81.8 |
| The Silent Orchard | 12.99 | 91.6 |
| Paper Lanterns | 11.25 | 100 |

## Explanation

An empty `OVER ()` treats all rows as one window, giving the grand total on every row. Two of six books bring in 57.3% of revenue. Pareto tables show where effort pays off most.
