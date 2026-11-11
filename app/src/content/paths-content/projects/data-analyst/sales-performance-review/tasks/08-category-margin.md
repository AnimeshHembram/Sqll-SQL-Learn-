---
id: spr-08-category-margin
title: Gross margin by category
order: 8
difficulty: intermediate
topic: Profitability
summary: Work out 2024 net revenue, cost, gross profit and gross margin for each category.
module: growth-drivers
duration: 20
dataset: kalaa-home
tables:
  - orders
  - order_items
  - products
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate gross profit and margin
  - Combine facts from two tables in one aggregate
prerequisites:
  - Joins
  - Aggregate arithmetic
---

## Task

Revenue is not profit. For 2024 delivered orders, return per `category`:

- `net_revenue`: the sum of `quantity * unit_price - discount`,
- `cost`: the sum of `quantity * unit_cost` (from `products`),
- `gross_profit`: net revenue minus cost,
- `margin_pct`: gross profit as a percentage of net revenue, rounded to one decimal.

Sort by `margin_pct`, highest first.

## Starter query

```sql
SELECT p.category, p.name, p.unit_cost, p.list_price
FROM products AS p
ORDER BY p.category, p.name;
```

## Hints

1. Join `orders`, `order_items` and `products`, keep delivered 2024 orders and group by category.
2. Cost depends on how many units were sold: multiply `p.unit_cost` by `i.quantity` before summing.
3. Use the actual selling price and discount from `order_items`, not `list_price`: discounts are exactly what squeezes margin.

## Solution

```sql
SELECT p.category,
       SUM(i.quantity * i.unit_price - i.discount) AS net_revenue,
       SUM(i.quantity * p.unit_cost) AS cost,
       SUM(i.quantity * i.unit_price - i.discount) - SUM(i.quantity * p.unit_cost) AS gross_profit,
       ROUND(100.0 * (SUM(i.quantity * i.unit_price - i.discount) - SUM(i.quantity * p.unit_cost))
             / SUM(i.quantity * i.unit_price - i.discount), 1) AS margin_pct
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
JOIN products AS p ON p.product_id = i.product_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
GROUP BY p.category
ORDER BY margin_pct DESC;
```

## Expected result

| category | net_revenue | cost | gross_profit | margin_pct |
| --- | --- | --- | --- | --- |
| Textiles | 396107 | 179640 | 216467 | 54.6 |
| Wall Decor | 188112 | 87080 | 101032 | 53.7 |
| Kitchen & Dining | 116862 | 56320 | 60542 | 51.8 |
| Lighting | 486065 | 235450 | 250615 | 51.6 |
| Furniture | 356090 | 203150 | 152940 | 42.9 |

## Explanation

Revenue comes from what was charged (`order_items`), cost from the product catalogue (`products`). Both are multiplied by quantity line by line before summing.

**What it tells the business:** Textiles have the best margin (54.6%) and Lighting, the biggest seller, still earns 51.6%. **Furniture's margin is only 42.9%**: about ₹1.53 lakh of gross profit on ₹3.56 lakh of revenue. Furniture is shrinking *and* it is the least profitable category, so the growth shift towards décor is healthy rather than worrying.

**Common mistake:** computing margin from `list_price - unit_cost`. That ignores the discounts actually given and overstates every category's margin.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT p.category,
       SUM(i.quantity * i.unit_price - i.discount) AS net_revenue,
       SUM(p.unit_cost) AS cost,
       SUM(i.quantity * i.unit_price - i.discount) - SUM(p.unit_cost) AS gross_profit,
       ROUND(100.0 * (SUM(i.quantity * i.unit_price - i.discount) - SUM(p.unit_cost)) / SUM(i.quantity * i.unit_price - i.discount), 1) AS margin_pct
FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
GROUP BY p.category ORDER BY margin_pct DESC;
```

Feedback: incorrect-output

```sql
SELECT p.category,
       SUM(i.quantity * p.list_price) AS net_revenue,
       SUM(i.quantity * p.unit_cost) AS cost,
       SUM(i.quantity * p.list_price) - SUM(i.quantity * p.unit_cost) AS gross_profit,
       ROUND(100.0 * (SUM(i.quantity * p.list_price) - SUM(i.quantity * p.unit_cost)) / SUM(i.quantity * p.list_price), 1) AS margin_pct
FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
GROUP BY p.category ORDER BY margin_pct DESC;
```
