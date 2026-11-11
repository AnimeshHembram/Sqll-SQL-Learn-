---
id: da-day-150
title: Case study: the monthly board pack
order: 150
difficulty: advanced
topic: Case studies
summary: Build a month-by-month management summary from the bookstore tables in one query.
module: data-analyst
duration: 20
dataset: bookstore
tables:
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Assemble a multi-metric report from one base CTE
  - Combine aggregates, window functions and ties in one result
prerequisites:
  - Day 89
  - Day 120
---

## Task

Day 150. The board wants one table for the first quarter of 2025, from **non-cancelled** orders in the bookstore. For each month with orders, return:

- `month` (`YYYY-MM`), `revenue` (rounded to 2 decimal places), `orders`, `aov` (revenue per order, rounded to 2 decimal places),
- `new_customers`: customers whose **first non-cancelled order** was in that month,
- `change_pct`: revenue change from the previous month as a percentage, rounded to 1 decimal place (`NULL` for the first month),
- `top_genre`: the genre with the highest revenue that month (if genres tie, list them alphabetically joined with `' / '`),
- `cumulative_revenue`: revenue so far this year, rounded to 2 decimal places.

Sort by `month`.

## Starter query

```sql
SELECT o.id, o.customer_id, o.order_date, o.status
FROM orders AS o
ORDER BY o.order_date;
```

## Hints

1. Start from one row per non-cancelled order line with its month, order id, customer, genre and line revenue. Every other step is built from this CTE.
2. Monthly totals: `SUM(revenue)`, `COUNT(DISTINCT order_id)`. New customers: each customer's `MIN(month)`, counted per month. Top genre: revenue per month and genre, keep those equal to the month's maximum, and join them with `group_concat(genre, ' / ' ORDER BY genre)`.
3. Join the pieces on month, and use window functions over the monthly rows: `LAG(revenue) OVER (ORDER BY month)` for the change and `SUM(revenue) OVER (ORDER BY month)` for the cumulative figure. Round only in the final `SELECT`.

## Solution

```sql
WITH lines AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, o.id AS order_id, o.customer_id, b.genre,
    oi.quantity * oi.unit_price AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
),
monthly AS (
  SELECT month, SUM(revenue) AS revenue, COUNT(DISTINCT order_id) AS orders FROM lines GROUP BY month
),
first_months AS (
  SELECT customer_id, MIN(month) AS month FROM lines GROUP BY customer_id
),
new_customers AS (
  SELECT month, COUNT(*) AS new_customers FROM first_months GROUP BY month
),
genre_revenue AS (
  SELECT month, genre, SUM(revenue) AS revenue FROM lines GROUP BY month, genre
),
top_genres AS (
  SELECT g.month, group_concat(g.genre, ' / ' ORDER BY g.genre) AS top_genre
  FROM genre_revenue AS g
  WHERE g.revenue = (SELECT MAX(x.revenue) FROM genre_revenue AS x WHERE x.month = g.month)
  GROUP BY g.month
)
SELECT m.month,
  ROUND(m.revenue, 2) AS revenue,
  m.orders,
  ROUND(m.revenue / m.orders, 2) AS aov,
  COALESCE(n.new_customers, 0) AS new_customers,
  ROUND(100.0 * (m.revenue - LAG(m.revenue) OVER (ORDER BY m.month)) / LAG(m.revenue) OVER (ORDER BY m.month), 1) AS change_pct,
  t.top_genre,
  ROUND(SUM(m.revenue) OVER (ORDER BY m.month), 2) AS cumulative_revenue
FROM monthly AS m
LEFT JOIN new_customers AS n ON n.month = m.month
LEFT JOIN top_genres AS t ON t.month = m.month
ORDER BY m.month;
```

## Expected result

| month | revenue | orders | aov | new_customers | change_pct | top_genre | cumulative_revenue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2025-01 | 48.47 | 2 | 24.23 | 2 | NULL | Science | 48.47 |
| 2025-02 | 29.25 | 1 | 29.25 | 0 | -39.7 | Science fiction | 77.72 |
| 2025-03 | 55.74 | 2 | 27.87 | 1 | 90.6 | Fantasy | 133.46 |

## Explanation

The 150-day capstone builds a management summary the way analysts do in practice: one clean base CTE at the finest grain needed (order lines), then a small CTE per metric at the month grain, joined at the end. Each piece can be checked on its own, and every metric is guaranteed to use the same filter (non-cancelled orders), because they all come from the same base.

February has no new customers: Aisha Khan, its only buyer, first ordered in January. Its revenue fell 39.7% while March's rose 90.6%, and the quarter ends at 133.46, the total net revenue seen throughout the path. The top-genre step keeps ties by comparing with the month's maximum, and `group_concat(... ORDER BY genre)` lists tied genres in a fixed order.

**Common mistakes:** counting orders with `COUNT(*)` after joining order lines (which counts lines), and calling every buyer of the month "new" instead of only first-time buyers.

## Wrong answers

Feedback: incorrect-output

```sql
WITH lines AS (SELECT strftime('%Y-%m', o.order_date) AS month, o.id AS order_id, o.customer_id, b.genre, oi.quantity * oi.unit_price AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled'), monthly AS (SELECT month, SUM(revenue) AS revenue, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS buyers FROM lines GROUP BY month), genre_revenue AS (SELECT month, genre, SUM(revenue) AS revenue FROM lines GROUP BY month, genre), top_genres AS (SELECT g.month, group_concat(g.genre, ' / ' ORDER BY g.genre) AS top_genre FROM genre_revenue AS g WHERE g.revenue = (SELECT MAX(x.revenue) FROM genre_revenue AS x WHERE x.month = g.month) GROUP BY g.month) SELECT m.month, ROUND(m.revenue, 2) AS revenue, m.orders, ROUND(m.revenue / m.orders, 2) AS aov, m.buyers AS new_customers, ROUND(100.0 * (m.revenue - LAG(m.revenue) OVER (ORDER BY m.month)) / LAG(m.revenue) OVER (ORDER BY m.month), 1) AS change_pct, t.top_genre, ROUND(SUM(m.revenue) OVER (ORDER BY m.month), 2) AS cumulative_revenue FROM monthly AS m LEFT JOIN top_genres AS t ON t.month = m.month ORDER BY m.month;
```
