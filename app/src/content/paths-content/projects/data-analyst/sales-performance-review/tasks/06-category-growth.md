---
id: spr-06-category-growth
title: Which categories drove growth
order: 6
difficulty: intermediate
topic: Growth drivers
summary: Compare category revenue across the two years and work out each category's share of the total change.
module: growth-drivers
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
  - products
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot periods into columns with conditional aggregation
  - Calculate contribution to total change
prerequisites:
  - CASE inside SUM
  - Window functions (OVER ())
---

## Task

Revenue grew by about ₹2.1 lakh. Which product categories produced that change? For each `category`, return:

- `revenue_2023` and `revenue_2024` (net revenue, delivered orders),
- `change`: 2024 minus 2023,
- `growth_pct`: the change as a percentage of 2023, rounded to one decimal,
- `share_of_total_change_pct`: the category's change as a percentage of the **total** change across all categories, rounded to one decimal.

Sort by `change`, largest first.

## Starter query

```sql
SELECT p.category, SUM(i.quantity * i.unit_price - i.discount) AS revenue
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
JOIN products AS p ON p.product_id = i.product_id
WHERE o.status = 'delivered'
GROUP BY p.category;
```

## Hints

1. Pivot the two years into columns with conditional aggregation: `SUM(CASE WHEN o.order_date < '2024-01-01' THEN ... ELSE 0 END)`.
2. Put the pivot in a CTE so the final `SELECT` can use `revenue_2023` and `revenue_2024` by name.
3. The total change across categories is `SUM(revenue_2024 - revenue_2023) OVER ()`. Shares of the total change can be negative and can be above 100%.

## Solution

```sql
WITH by_category AS (
  SELECT p.category,
         SUM(CASE WHEN o.order_date < '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2023,
         SUM(CASE WHEN o.order_date >= '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2024
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered'
  GROUP BY p.category
)
SELECT category,
       revenue_2023,
       revenue_2024,
       revenue_2024 - revenue_2023 AS change,
       ROUND(100.0 * (revenue_2024 - revenue_2023) / revenue_2023, 1) AS growth_pct,
       ROUND(100.0 * (revenue_2024 - revenue_2023) / SUM(revenue_2024 - revenue_2023) OVER (), 1) AS share_of_total_change_pct
FROM by_category
ORDER BY change DESC;
```

## Expected result

| category | revenue_2023 | revenue_2024 | change | growth_pct | share_of_total_change_pct |
| --- | --- | --- | --- | --- | --- |
| Lighting | 292986 | 486065 | 193079 | 65.9 | 91 |
| Textiles | 233491 | 396107 | 162616 | 69.6 | 76.7 |
| Wall Decor | 148592 | 188112 | 39520 | 26.6 | 18.6 |
| Kitchen & Dining | 193597 | 116862 | -76735 | -39.6 | -36.2 |
| Furniture | 462441 | 356090 | -106351 | -23 | -50.1 |

## Explanation

Conditional aggregation turns rows into columns, and the empty window `OVER ()` puts the total change on every row so each category can be compared with it.

**What it tells the business:** **Lighting (+65.9%) and Textiles (+69.6%) added more than the whole company's growth**: 91.0% and 76.7% of the total change. Furniture (−23.0%) and Kitchen & Dining (−39.6%) took away the equivalent of 86% of it. Growth is concentrated in lower-priced décor, which also explains the falling average order value from Task 3: fewer ₹10,000 furniture orders, more ₹1,000 to ₹3,000 décor orders.

**Common mistake:** dividing each change by total 2024 revenue. That answers "how big is the change compared with the business", not "how much of the growth came from here".

## Wrong answers

Feedback: incorrect-output

```sql
WITH by_category AS (
  SELECT p.category,
         SUM(CASE WHEN o.order_date < '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2023,
         SUM(CASE WHEN o.order_date >= '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2024
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered' GROUP BY p.category
)
SELECT category, revenue_2023, revenue_2024, revenue_2024 - revenue_2023 AS change,
       ROUND(100.0 * (revenue_2024 - revenue_2023) / revenue_2023, 1) AS growth_pct,
       ROUND(100.0 * (revenue_2024 - revenue_2023) / SUM(revenue_2024) OVER (), 1) AS share_of_total_change_pct
FROM by_category ORDER BY change DESC;
```

Feedback: incorrect-output

```sql
WITH by_category AS (
  SELECT p.category,
         SUM(CASE WHEN o.order_date < '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2023,
         SUM(CASE WHEN o.order_date >= '2024-01-01' THEN i.quantity * i.unit_price - i.discount ELSE 0 END) AS revenue_2024
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status = 'delivered' GROUP BY p.category
)
SELECT category, revenue_2023, revenue_2024, revenue_2024 - revenue_2023 AS change,
       ROUND(100 * (revenue_2024 - revenue_2023) / revenue_2023, 1) AS growth_pct,
       ROUND(100 * (revenue_2024 - revenue_2023) / SUM(revenue_2024 - revenue_2023) OVER (), 1) AS share_of_total_change_pct
FROM by_category ORDER BY change DESC;
```
