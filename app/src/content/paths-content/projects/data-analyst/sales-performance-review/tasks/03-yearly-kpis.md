---
id: spr-03-yearly-kpis
title: Headline KPIs for both years
order: 3
difficulty: intermediate
topic: KPIs
summary: Build the yearly KPI table: delivered orders, customers, net revenue, average order value and revenue growth.
module: revenue-and-growth
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Aggregate in two steps with CTEs
  - Compare periods with LAG
prerequisites:
  - Joins
  - GROUP BY
  - LAG
---

## Task

The CEO's first question: *how much did we grow?* Build the headline KPI table, one row per year:

- `year`,
- `orders`: delivered orders,
- `customers`: distinct customers with a delivered order,
- `net_revenue`: the sum of `quantity * unit_price - discount` over the lines of delivered orders,
- `avg_order_value`: average net revenue **per order**, rounded to a whole rupee,
- `revenue_growth_pct`: the change in net revenue from the previous year, as a percentage rounded to one decimal (NULL for the first year).

Sort by `year`.

## Starter query

```sql
SELECT substr(o.order_date, 1, 4) AS year,
       SUM(i.quantity * i.unit_price - i.discount) AS revenue
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
GROUP BY year;
```

## Hints

1. Average order value is an average over **orders**, not over order lines. Total each order first in a CTE (one row per delivered order with its revenue), then aggregate that CTE by year.
2. In the yearly step, `COUNT(*)` counts orders, `COUNT(DISTINCT customer_id)` counts customers and `AVG(revenue)` is the average order value.
3. Growth compares a row with the previous one: `LAG(net_revenue) OVER (ORDER BY year)`. Put the yearly totals in a second CTE and compute the growth in the final `SELECT`.

## Solution

```sql
WITH order_revenue AS (
  SELECT o.order_id, o.customer_id, substr(o.order_date, 1, 4) AS year,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.order_id
),
yearly AS (
  SELECT year, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers,
         SUM(revenue) AS net_revenue, ROUND(AVG(revenue), 0) AS avg_order_value
  FROM order_revenue
  GROUP BY year
)
SELECT year, orders, customers, net_revenue, avg_order_value,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY year))
             / LAG(net_revenue) OVER (ORDER BY year), 1) AS revenue_growth_pct
FROM yearly
ORDER BY year;
```

## Expected result

| year | orders | customers | net_revenue | avg_order_value | revenue_growth_pct |
| --- | --- | --- | --- | --- | --- |
| 2023 | 225 | 153 | 1331107 | 5916 | NULL |
| 2024 | 292 | 234 | 1543236 | 5285 | 15.9 |

## Explanation

Two levels of aggregation are needed: lines → orders (so the average is per order), then orders → years. `LAG` reads the previous year's revenue from the `yearly` CTE.

**What it tells the business:** net revenue grew **15.9%**, from ₹13.31 lakh to ₹15.43 lakh. Growth came from more orders (225 → 292) and many more customers (153 → 234), while the **average order value fell** from ₹5,916 to ₹5,285. Customers are buying, but smaller baskets. The next tasks explain why.

**Common mistake:** averaging `quantity * unit_price - discount` straight from `order_items`. That is the average **line**, which is smaller than the average order whenever an order has more than one line.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_revenue AS (
  SELECT o.order_id, o.customer_id, substr(o.order_date, 1, 4) AS year,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  GROUP BY o.order_id
),
yearly AS (
  SELECT year, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers,
         SUM(revenue) AS net_revenue, ROUND(AVG(revenue), 0) AS avg_order_value
  FROM order_revenue GROUP BY year
)
SELECT year, orders, customers, net_revenue, avg_order_value,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY year)) / LAG(net_revenue) OVER (ORDER BY year), 1) AS revenue_growth_pct
FROM yearly ORDER BY year;
```

Feedback: incorrect-output

```sql
WITH yearly AS (
  SELECT substr(o.order_date, 1, 4) AS year, COUNT(DISTINCT o.order_id) AS orders, COUNT(DISTINCT o.customer_id) AS customers,
         SUM(i.quantity * i.unit_price - i.discount) AS net_revenue,
         ROUND(AVG(i.quantity * i.unit_price - i.discount), 0) AS avg_order_value
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY year
)
SELECT year, orders, customers, net_revenue, avg_order_value,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY year)) / LAG(net_revenue) OVER (ORDER BY year), 1) AS revenue_growth_pct
FROM yearly ORDER BY year;
```
