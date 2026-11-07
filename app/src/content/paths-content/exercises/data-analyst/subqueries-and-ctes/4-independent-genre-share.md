---
id: da-genre-share
title: Each genre's share of revenue
order: 4
difficulty: advanced
topic: CTE and percentages
summary: Calculate each genre's revenue and its percentage of total revenue.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate parts and a total from the same CTE
  - Avoid integer division in percentages
---

## Task

For a revenue mix chart, return one row per genre with:

- `genre`
- `revenue`: the genre's revenue (`quantity * unit_price`), not counting cancelled orders, rounded to 2 decimal places
- `pct`: the genre's revenue as a percentage of the revenue of all genres, rounded to 1 decimal place

Row order does not matter.

## Starter query

```sql
SELECT b.genre, oi.quantity * oi.unit_price AS line_total
FROM order_items AS oi
JOIN books AS b ON oi.book_id = b.id;
```

## Hints

1. Step 1: a CTE with each genre's revenue (join `orders` too, to leave out cancelled orders).
2. The total is `(SELECT SUM(revenue) FROM your_cte)`. Divide each genre's revenue by it.
3. `ROUND(100.0 * revenue / (SELECT SUM(revenue) FROM genre_revenue), 1) AS pct`. Round the revenue only in the final `SELECT`, so the percentages use exact values.

## Solution

```sql
WITH genre_revenue AS (
  SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM order_items AS oi
  JOIN books AS b ON oi.book_id = b.id
  JOIN orders AS o ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY b.genre
)
SELECT genre, ROUND(revenue, 2) AS revenue,
  ROUND(100.0 * revenue / (SELECT SUM(revenue) FROM genre_revenue), 1) AS pct
FROM genre_revenue;
```

## Expected result

| genre | revenue | pct |
| --- | --- | --- |
| Fantasy | 57.75 | 43.3 |
| Mystery | 27.74 | 20.8 |
| Science | 29.97 | 22.5 |
| Science fiction | 18 | 13.5 |

## Explanation

The CTE calculates each genre's revenue once. The subquery adds those up to the total (133.46), and each genre's share is its revenue divided by that total. Using `100.0` keeps the division in decimals.
