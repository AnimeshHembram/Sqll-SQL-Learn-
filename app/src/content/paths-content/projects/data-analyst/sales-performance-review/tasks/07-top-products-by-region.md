---
id: spr-07-top-products-by-region
title: Top three products in each region
order: 7
difficulty: intermediate
topic: Ranking
summary: Rank 2024 products by net revenue within each region and keep the top three.
module: growth-drivers
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
  - products
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Rank within groups with PARTITION BY
  - Filter on a window function in an outer query
prerequisites:
  - RANK and ROW_NUMBER
  - Common table expressions
---

## Task

The merchandising team plans regional homepages. For 2024, rank products by net revenue **within each region** (the customer's region; delivered orders) and return the top three per region:

`region`, `rank_in_region` (1 to 3, using `RANK`), `product` (the product name) and `revenue`.

Sort by `region`, then `rank_in_region`, then `product`.

## Starter query

```sql
SELECT p.name AS product, SUM(i.quantity * i.unit_price - i.discount) AS revenue
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
JOIN products AS p ON p.product_id = i.product_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
GROUP BY p.name
ORDER BY revenue DESC
LIMIT 3;
```

## Hints

1. `LIMIT 3` keeps three rows for the whole query. You need three **per region**, so rank inside each region instead.
2. First total revenue per region and product in a CTE (add the `customers` join for the region). Then rank in a second step with `RANK() OVER (PARTITION BY region ORDER BY revenue DESC)`.
3. A window function cannot be used in `WHERE` in the same `SELECT`, so filter `rank_in_region <= 3` in an outer query.

## Solution

```sql
WITH product_region AS (
  SELECT c.region, p.name AS product, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o
  JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY c.region, p.name
),
ranked AS (
  SELECT region, product, revenue,
         RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rank_in_region
  FROM product_region
)
SELECT region, rank_in_region, product, revenue
FROM ranked
WHERE rank_in_region <= 3
ORDER BY region, rank_in_region, product;
```

## Expected result

| region | rank_in_region | product | revenue |
| --- | --- | --- | --- |
| East | 1 | Teak Floor Lamp | 31619 |
| East | 2 | Cotton Dhurrie Rug | 23793 |
| East | 3 | Jaipuri Razai Quilt | 22492 |
| North | 1 | Sheesham Coffee Table | 59394 |
| North | 2 | Cotton Dhurrie Rug | 31491 |
| North | 3 | Jaipuri Razai Quilt | 26091 |
| South | 1 | Teak Floor Lamp | 113003 |
| South | 2 | Cotton Dhurrie Rug | 49510 |
| South | 3 | Jaipuri Razai Quilt | 42584 |
| West | 1 | Teak Floor Lamp | 47566 |
| West | 2 | Mango Wood Bookshelf | 32997 |
| West | 3 | Rattan Pendant Light | 31670 |

## Explanation

`PARTITION BY region` restarts the ranking for each region. `RANK` gives tied products the same rank, so a region could show more than three rows if products tie; the outer `WHERE` keeps everything ranked 1 to 3.

**What it tells the business:** the **Teak Floor Lamp is the number one product in three regions** and earned ₹1.13 lakh in the South alone. The Cotton Dhurrie Rug and the Jaipuri Razai Quilt appear in the top three of three regions. The North is the exception: its best seller is still the Sheesham Coffee Table, a furniture item, which matches its weak growth.

**Common mistake:** `ROW_NUMBER() OVER (ORDER BY revenue DESC)` without `PARTITION BY` ranks across all regions, so only the overall top three rows survive.

## Wrong answers

Feedback: incorrect-output

```sql
WITH product_region AS (
  SELECT c.region, p.name AS product, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY c.region, p.name
),
ranked AS (
  SELECT region, product, revenue, RANK() OVER (ORDER BY revenue DESC) AS rank_in_region FROM product_region
)
SELECT region, rank_in_region, product, revenue FROM ranked WHERE rank_in_region <= 3
ORDER BY region, rank_in_region, product;
```

Feedback: incorrect-output

```sql
WITH product_region AS (
  SELECT c.region, p.name AS product, SUM(i.quantity * i.unit_price) AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
  GROUP BY c.region, p.name
),
ranked AS (
  SELECT region, product, revenue, RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rank_in_region FROM product_region
)
SELECT region, rank_in_region, product, revenue FROM ranked WHERE rank_in_region <= 3
ORDER BY region, rank_in_region, product;
```
