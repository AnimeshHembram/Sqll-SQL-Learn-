---
id: da-day-180
title: Case study: the annual customer review
order: 180
difficulty: advanced
topic: Case studies
summary: Profile every customer from the bookstore tables, including those with no completed orders.
module: data-analyst
duration: 20
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Profile every row of a dimension with LEFT JOINs
  - Combine ties, windows and segments in one report
prerequisites:
  - Day 150
  - Day 98
---

## Task

Day 180. Prepare the annual customer review from the bookstore. Using **non-cancelled** orders, return one row for **every customer**:

- `name`, `orders`, `revenue` (rounded to 2 decimal places; 0 when none),
- `favourite_genre`: the genre with the most units bought (ties listed alphabetically, joined with `' / '`; `NULL` when none),
- `revenue_share_pct`: share of all revenue, rounded to 1 decimal place,
- `rank`: by revenue, highest first, with `RANK()`; customers with no revenue get `NULL`,
- `segment`: `'top customer'` for rank 1, `'active'` for other customers with revenue, `'cancelled only'` for customers whose orders were all cancelled, `'never ordered'` otherwise.

Sort by `rank` (customers without a rank last), then `name`.

## Starter query

```sql
SELECT c.name, o.id AS order_id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name, o.id;
```

## Hints

1. Build one base CTE of non-cancelled order lines (customer id, order id, genre, quantity, revenue). Customers without lines must still appear, so start the final query from `customers`.
2. Per customer: orders and revenue from the base; favourite genre from units per customer and genre, keeping those equal to the customer's maximum and joining them with `group_concat(genre, ' / ' ORDER BY genre)`. Whether a customer has any order at all, cancelled ones included, comes from `orders` directly.
3. `RANK() OVER (ORDER BY revenue DESC)` must only rank customers with revenue: compute it in a CTE over those customers and `LEFT JOIN` it. Sort with `ORDER BY rank IS NULL, rank, name`.

## Solution

```sql
WITH lines AS (
  SELECT o.customer_id, o.id AS order_id, b.genre, oi.quantity, oi.quantity * oi.unit_price AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
),
per_customer AS (
  SELECT customer_id, COUNT(DISTINCT order_id) AS orders, SUM(revenue) AS revenue FROM lines GROUP BY customer_id
),
genre_units AS (
  SELECT customer_id, genre, SUM(quantity) AS units FROM lines GROUP BY customer_id, genre
),
favourites AS (
  SELECT g.customer_id, group_concat(g.genre, ' / ' ORDER BY g.genre) AS favourite_genre
  FROM genre_units AS g
  WHERE g.units = (SELECT MAX(x.units) FROM genre_units AS x WHERE x.customer_id = g.customer_id)
  GROUP BY g.customer_id
),
ranked AS (
  SELECT customer_id, RANK() OVER (ORDER BY revenue DESC) AS rank FROM per_customer
)
SELECT c.name,
  COALESCE(p.orders, 0) AS orders,
  ROUND(COALESCE(p.revenue, 0), 2) AS revenue,
  f.favourite_genre,
  ROUND(100.0 * COALESCE(p.revenue, 0) / (SELECT SUM(revenue) FROM lines), 1) AS revenue_share_pct,
  r.rank,
  CASE
    WHEN r.rank = 1 THEN 'top customer'
    WHEN p.revenue > 0 THEN 'active'
    WHEN EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id) THEN 'cancelled only'
    ELSE 'never ordered'
  END AS segment
FROM customers AS c
LEFT JOIN per_customer AS p ON p.customer_id = c.id
LEFT JOIN favourites AS f ON f.customer_id = c.id
LEFT JOIN ranked AS r ON r.customer_id = c.id
ORDER BY r.rank IS NULL, r.rank, c.name;
```

## Expected result

| name | orders | revenue | favourite_genre | revenue_share_pct | rank | segment |
| --- | --- | --- | --- | --- | --- | --- |
| Aisha Khan | 2 | 62.22 | Science | 46.6 | 1 | top customer |
| Daniel Kim | 1 | 45.75 | Fantasy | 34.3 | 2 | active |
| Rahul Mehta | 2 | 25.49 | Fantasy / Science | 19.1 | 3 | active |
| Meera Pillai | 0 | 0 | NULL | 0 | NULL | never ordered |
| Sofia Rossi | 0 | 0 | NULL | 0 | NULL | cancelled only |

## Explanation

Day 180 brings the path's techniques together on the real bookstore tables. One base CTE at the order-line grain feeds every metric, so every figure uses the same rule: cancelled orders never count.

The review must cover **every** customer, which is why the final query starts from `customers` and joins each metric with `LEFT JOIN`. The segments then explain the empty rows instead of hiding them. Sofia Rossi ordered once and cancelled, a recovery opportunity. Meera Pillai has never ordered, an onboarding question.

Ties appear twice. Rahul Mehta bought one Fantasy and one Science book, so both are his favourites; Aisha Khan's two copies of Counting Stars make Science hers. Ranking only customers with revenue keeps the two inactive customers from sharing a rank of their own.

**Common mistakes:** an inner join, which drops Sofia and Meera from the review; and ranking everyone, which gives customers with no revenue a rank of 4.

## Wrong answers

Feedback: missing-rows

```sql
WITH lines AS (SELECT o.customer_id, o.id AS order_id, b.genre, oi.quantity, oi.quantity * oi.unit_price AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled'), per_customer AS (SELECT customer_id, COUNT(DISTINCT order_id) AS orders, SUM(revenue) AS revenue FROM lines GROUP BY customer_id), genre_units AS (SELECT customer_id, genre, SUM(quantity) AS units FROM lines GROUP BY customer_id, genre), favourites AS (SELECT g.customer_id, group_concat(g.genre, ' / ' ORDER BY g.genre) AS favourite_genre FROM genre_units AS g WHERE g.units = (SELECT MAX(x.units) FROM genre_units AS x WHERE x.customer_id = g.customer_id) GROUP BY g.customer_id), ranked AS (SELECT customer_id, RANK() OVER (ORDER BY revenue DESC) AS rank FROM per_customer) SELECT c.name, p.orders, ROUND(p.revenue, 2) AS revenue, f.favourite_genre, ROUND(100.0 * p.revenue / (SELECT SUM(revenue) FROM lines), 1) AS revenue_share_pct, r.rank, CASE WHEN r.rank = 1 THEN 'top customer' ELSE 'active' END AS segment FROM customers AS c JOIN per_customer AS p ON p.customer_id = c.id JOIN favourites AS f ON f.customer_id = c.id JOIN ranked AS r ON r.customer_id = c.id ORDER BY r.rank, c.name;
```
