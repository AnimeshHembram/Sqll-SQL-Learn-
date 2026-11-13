---
id: da-day-330
title: Case study: a genre scorecard for the first quarter
order: 330
difficulty: advanced
topic: Case studies
summary: Combine revenue, share, month-over-month growth and cancellations per genre from the bookstore tables.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine several measures per category
  - Pivot months into columns
prerequisites:
  - Day 300
  - Day 59
---

## Task

Day 330. Using the bookstore tables, build a scorecard for **every genre in the catalogue** for January to March 2025:

- `revenue` (non-cancelled order lines, 0 when none) and `share_pct` (share of all non-cancelled revenue),
- `jan`, `feb` and `mar`: monthly non-cancelled revenue (0 when none),
- `cancelled_revenue`: revenue of cancelled order lines (0 when none).

Round money to 2 decimal places and the share to 1. Return `genre`, `revenue`, `share_pct`, `jan`, `feb`, `mar` and `cancelled_revenue`, sorted by `revenue` from highest, then `genre`.

## Starter query

```sql
SELECT b.genre, o.order_date, o.status, oi.quantity * oi.unit_price AS amount
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
ORDER BY b.genre, o.order_date;
```

## Hints

1. Build one row per order line with its genre, month, status and amount in a CTE.
2. Start from the distinct genres in `books` and `LEFT JOIN` that CTE, so a genre with no sales stays. Pivot months with `SUM(CASE WHEN month = '2025-01' AND status <> 'cancelled' THEN amount ELSE 0 END)`.
3. Share: the genre's revenue over `SUM(...) OVER ()` of all genres' revenue.

## Solution

```sql
WITH sales AS (
  SELECT b.genre, strftime('%Y-%m', o.order_date) AS month, o.status, oi.quantity * oi.unit_price AS amount
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
),
genres AS (
  SELECT DISTINCT genre FROM books
),
scored AS (
  SELECT g.genre,
    COALESCE(SUM(CASE WHEN s.status <> 'cancelled' THEN s.amount END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN s.status <> 'cancelled' AND s.month = '2025-01' THEN s.amount END), 0) AS jan,
    COALESCE(SUM(CASE WHEN s.status <> 'cancelled' AND s.month = '2025-02' THEN s.amount END), 0) AS feb,
    COALESCE(SUM(CASE WHEN s.status <> 'cancelled' AND s.month = '2025-03' THEN s.amount END), 0) AS mar,
    COALESCE(SUM(CASE WHEN s.status = 'cancelled' THEN s.amount END), 0) AS cancelled_revenue
  FROM genres AS g
  LEFT JOIN sales AS s ON s.genre = g.genre
  GROUP BY g.genre
)
SELECT genre, ROUND(revenue, 2) AS revenue, ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS share_pct,
  ROUND(jan, 2) AS jan, ROUND(feb, 2) AS feb, ROUND(mar, 2) AS mar, ROUND(cancelled_revenue, 2) AS cancelled_revenue
FROM scored
ORDER BY revenue DESC, genre;
```

## Expected result

| genre | revenue | share_pct | jan | feb | mar | cancelled_revenue |
| --- | --- | --- | --- | --- | --- | --- |
| Fantasy | 57.75 | 43.3 | 15.5 | 11.25 | 31 | 0 |
| Science | 29.97 | 22.5 | 19.98 | 0 | 9.99 | 0 |
| Mystery | 27.74 | 20.8 | 12.99 | 0 | 14.75 | 12.99 |
| Science fiction | 18 | 13.5 | 0 | 18 | 0 | 0 |

## Explanation

Day 330 combines several measures into one scorecard per genre: total revenue and share, a monthly breakdown, and what was lost to cancellations. Building one row per order line first, with genre, month, status and amount, makes each measure a simple conditional sum.

Fantasy leads with 43% of revenue, mostly from March. Mystery shows why cancellations deserve their own column: its 27.74 of revenue would have been 40.73 without the cancelled order. Starting from the distinct genres in `books` would keep a genre with no sales in the scorecard with zeros (all four sold this quarter).

**Common mistake:** summing all order lines, cancelled ones included. Mystery's cancelled 12.99 is counted as revenue, and every share shifts.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales AS ( SELECT b.genre, strftime('%Y-%m', o.order_date) AS month, o.status, oi.quantity * oi.unit_price AS amount FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id ), genres AS (SELECT DISTINCT genre FROM books), scored AS (SELECT g.genre, COALESCE(SUM(s.amount), 0) AS revenue, COALESCE(SUM(CASE WHEN s.month = '2025-01' THEN s.amount END), 0) AS jan, COALESCE(SUM(CASE WHEN s.month = '2025-02' THEN s.amount END), 0) AS feb, COALESCE(SUM(CASE WHEN s.month = '2025-03' THEN s.amount END), 0) AS mar, COALESCE(SUM(CASE WHEN s.status = 'cancelled' THEN s.amount END), 0) AS cancelled_revenue FROM genres AS g LEFT JOIN sales AS s ON s.genre = g.genre GROUP BY g.genre) SELECT genre, ROUND(revenue, 2) AS revenue, ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS share_pct, ROUND(jan, 2) AS jan, ROUND(feb, 2) AS feb, ROUND(mar, 2) AS mar, ROUND(cancelled_revenue, 2) AS cancelled_revenue FROM scored ORDER BY revenue DESC, genre;
```
