---
id: spr-10-new-vs-returning
title: New and returning customers
order: 10
difficulty: advanced
topic: Customer analysis
summary: Split 2024 revenue between customers who bought for the first time in 2024 and customers who had bought before.
module: customers-and-channels
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Separate new and returning customers by first purchase
  - Combine two CTEs with a join
prerequisites:
  - MIN with GROUP BY
  - Common table expressions
  - Window functions over aggregates
---

## Task

Is Kalaa Home growing by winning new customers or by keeping existing ones? A customer is **Returning** in 2024 if their first delivered order was before 2024, and **New** if their first delivered order was in 2024.

For each `customer_type`, return `customers` (distinct customers with a delivered 2024 order), `orders` (delivered 2024 orders), `net_revenue` (2024) and `revenue_share_pct` (share of 2024 net revenue, rounded to one decimal). Sort by `net_revenue`, largest first.

## Starter query

```sql
SELECT customer_id, MIN(order_date) AS first_order_date
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
LIMIT 10;
```

## Hints

1. Keep the starter query as a CTE of first delivered orders. Make a second CTE of delivered 2024 orders with their revenue (one row per order).
2. Join the two CTEs on `customer_id` and label each 2024 order with `CASE WHEN first_order_date < '2024-01-01' THEN 'Returning' ELSE 'New' END`.
3. The share uses a window over the grouped totals: `SUM(SUM(revenue)) OVER ()`.

## Solution

```sql
WITH first_orders AS (
  SELECT customer_id, MIN(order_date) AS first_order_date
  FROM orders
  WHERE status = 'delivered'
  GROUP BY customer_id
),
orders_2024 AS (
  SELECT o.order_id, o.customer_id, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY o.order_id
)
SELECT CASE WHEN f.first_order_date < '2024-01-01' THEN 'Returning' ELSE 'New' END AS customer_type,
       COUNT(DISTINCT o.customer_id) AS customers,
       COUNT(*) AS orders,
       SUM(o.revenue) AS net_revenue,
       ROUND(100.0 * SUM(o.revenue) / SUM(SUM(o.revenue)) OVER (), 1) AS revenue_share_pct
FROM orders_2024 AS o
JOIN first_orders AS f ON f.customer_id = o.customer_id
GROUP BY customer_type
ORDER BY net_revenue DESC;
```

## Expected result

| customer_type | customers | orders | net_revenue | revenue_share_pct |
| --- | --- | --- | --- | --- |
| New | 158 | 191 | 1040260 | 67.4 |
| Returning | 76 | 101 | 502976 | 32.6 |

## Explanation

The first-order date is computed over **all** delivered history, then attached to each 2024 order. That is the standard way to separate acquisition from retention.

**What it tells the business:** **two thirds of 2024 revenue (67.4%) came from new customers**: 158 people placing 191 orders. Returning customers were 76 people and 32.6% of revenue. Growth depends heavily on winning new buyers each year, which is expensive. The customer retention study (Project 2) looks at this pattern in depth.

**Common mistake:** classifying customers by `signup_date`. Many people sign up long before their first purchase, and a 2023 sign-up who first bought in 2024 is a new buyer, not a returning one.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders_2024 AS (
  SELECT o.order_id, o.customer_id, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY o.order_id
)
SELECT CASE WHEN c.signup_date < '2024-01-01' THEN 'Returning' ELSE 'New' END AS customer_type,
       COUNT(DISTINCT o.customer_id) AS customers, COUNT(*) AS orders, SUM(o.revenue) AS net_revenue,
       ROUND(100.0 * SUM(o.revenue) / SUM(SUM(o.revenue)) OVER (), 1) AS revenue_share_pct
FROM orders_2024 AS o JOIN customers AS c ON c.customer_id = o.customer_id
GROUP BY customer_type ORDER BY net_revenue DESC;
```

Feedback: incorrect-output

```sql
WITH orders_2024 AS (
  SELECT o.order_id, o.customer_id, o.order_date, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY o.order_id
),
first_orders AS (
  SELECT customer_id, MIN(order_date) AS first_order_date FROM orders_2024 GROUP BY customer_id
)
SELECT CASE WHEN f.first_order_date < '2024-01-01' THEN 'Returning' ELSE 'New' END AS customer_type,
       COUNT(DISTINCT o.customer_id) AS customers, COUNT(*) AS orders, SUM(o.revenue) AS net_revenue,
       ROUND(100.0 * SUM(o.revenue) / SUM(SUM(o.revenue)) OVER (), 1) AS revenue_share_pct
FROM orders_2024 AS o JOIN first_orders AS f ON f.customer_id = o.customer_id
GROUP BY customer_type ORDER BY net_revenue DESC;
```
