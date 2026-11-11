---
id: spr-12-regional-scorecard
title: The 2024 regional scorecard
order: 12
difficulty: advanced
topic: Executive reporting
summary: Bring the analysis together in one row per region: revenue, growth, target attainment, order value, returns, top category and a verdict.
module: final-challenge
duration: 45
dataset: kalaa-home
tables:
  - orders
  - order_items
  - customers
  - products
  - targets
orderMatters: true
checkColumnNames: true
objectives:
  - Combine several CTEs at different grains into one report
  - Turn metrics into a business verdict with CASE
prerequisites:
  - Every earlier task in this project
---

## Task

The leadership review needs one table: a **2024 scorecard with one row per region**. Use everything you have built so far. Return:

- `region`,
- `revenue_2024`: net revenue (delivered orders),
- `growth_pct`: change from 2023 net revenue as a percentage, rounded to one decimal,
- `target_attainment_pct`: 2024 net revenue as a percentage of the region's **annual** target (the four quarters added up), rounded to one decimal,
- `avg_order_value`: average net revenue per delivered 2024 order, rounded to a whole rupee,
- `return_rate_pct`: returned orders as a percentage of the region's non-cancelled 2024 orders, rounded to one decimal,
- `top_category`: the category with the highest 2024 net revenue in the region,
- `verdict`: `'On track'` if the region met its annual target; otherwise `'Growing, below target'` if 2024 revenue is at least 2023 revenue; otherwise `'Needs attention'`.

Sort by `revenue_2024`, largest first.

## Starter query

```sql
-- Plan the CTEs first. One possible plan:
--   lines          one row per order line of non-cancelled orders, with region, year, category and revenue
--   regional       2023 and 2024 net revenue per region
--   order_stats    average order value and return rate per region (2024, one row per order first)
--   annual_targets the four 2024 quarterly targets added up per region
--   category_rank  categories ranked by 2024 revenue within each region
SELECT region, SUM(revenue_target) AS target_2024
FROM targets
WHERE year = 2024
GROUP BY region;
```

## Hints

1. Build it in pieces, one CTE per measure, and check each piece on its own before joining. The plan in the starter query is one good order.
2. A `lines` CTE of non-cancelled order lines (with `region`, `year`, `category`, `status` and line `revenue`) feeds all the others. For order value and return rate, first group it into one row per 2024 order.
3. For the top category, `ROW_NUMBER() OVER (PARTITION BY region ORDER BY SUM(revenue) DESC)` in a grouped CTE, then join on `position = 1`. The verdict is a `CASE` with three branches checked in order.

## Solution

```sql
WITH lines AS (
  SELECT o.order_id, o.status, c.region, substr(o.order_date, 1, 4) AS year, p.category,
         i.quantity * i.unit_price - i.discount AS revenue
  FROM orders AS o
  JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status <> 'cancelled'
),
regional AS (
  SELECT region,
         SUM(CASE WHEN year = '2024' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2024,
         SUM(CASE WHEN year = '2023' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2023
  FROM lines
  GROUP BY region
),
orders_2024 AS (
  SELECT region, order_id, status, SUM(revenue) AS revenue
  FROM lines
  WHERE year = '2024'
  GROUP BY region, order_id, status
),
order_stats AS (
  SELECT region,
         ROUND(AVG(CASE WHEN status = 'delivered' THEN revenue END), 0) AS avg_order_value,
         ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct
  FROM orders_2024
  GROUP BY region
),
annual_targets AS (
  SELECT region, SUM(revenue_target) AS target_2024
  FROM targets
  WHERE year = 2024
  GROUP BY region
),
category_rank AS (
  SELECT region, category,
         ROW_NUMBER() OVER (PARTITION BY region ORDER BY SUM(revenue) DESC) AS position
  FROM lines
  WHERE year = '2024' AND status = 'delivered'
  GROUP BY region, category
)
SELECT r.region,
       r.revenue_2024,
       ROUND(100.0 * (r.revenue_2024 - r.revenue_2023) / r.revenue_2023, 1) AS growth_pct,
       ROUND(100.0 * r.revenue_2024 / t.target_2024, 1) AS target_attainment_pct,
       s.avg_order_value,
       s.return_rate_pct,
       k.category AS top_category,
       CASE
         WHEN r.revenue_2024 >= t.target_2024 THEN 'On track'
         WHEN r.revenue_2024 >= r.revenue_2023 THEN 'Growing, below target'
         ELSE 'Needs attention'
       END AS verdict
FROM regional AS r
JOIN annual_targets AS t ON t.region = r.region
JOIN order_stats AS s ON s.region = r.region
JOIN category_rank AS k ON k.region = r.region AND k.position = 1
ORDER BY r.revenue_2024 DESC;
```

## Expected result

| region | revenue_2024 | growth_pct | target_attainment_pct | avg_order_value | return_rate_pct | top_category | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| South | 610775 | 66.6 | 134.2 | 5930 | 7.2 | Lighting | On track |
| West | 358680 | 11.8 | 94.4 | 5353 | 17.3 | Lighting | Growing, below target |
| North | 334302 | -16.7 | 69.6 | 4845 | 9.2 | Furniture | Needs attention |
| East | 239479 | -1.1 | 87.1 | 4518 | 3.6 | Textiles | Needs attention |

## Explanation

Each CTE answers one question at the right grain: `regional` at region level, `orders_2024` at order level (so the averages and rates are per order), `annual_targets` from the targets table, and `category_rank` at region-and-category level. The final `SELECT` only joins finished pieces, one row per region each, so nothing is double counted.

**What it tells the business:**

- **South** is the engine: ₹6.11 lakh (+66.6%), 134.2% of target, led by Lighting.
- **West** grew 11.8% but reached only 94.4% of target, and its 17.3% return rate is the highest of any region.
- **North** is the main concern: −16.7% and 69.6% of target. Its top category is still Furniture, the category the market is moving away from.
- **East** is flat (−1.1%, 87.1% of target) after an almost empty first quarter, but it has the lowest return rate (3.6%).

**Common mistake:** joining order lines straight to targets, or computing the average order value from `lines`. Joining before aggregating multiplies rows: each target is repeated once per order line, and averages become averages of lines instead of orders. Aggregate each measure to one row per region first, then join.

## Wrong answers

Feedback: incorrect-output

```sql
WITH lines AS (
  SELECT o.order_id, o.status, c.region, substr(o.order_date, 1, 4) AS year, p.category,
         i.quantity * i.unit_price - i.discount AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status <> 'cancelled'
),
regional AS (
  SELECT region,
         SUM(CASE WHEN year = '2024' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2024,
         SUM(CASE WHEN year = '2023' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2023
  FROM lines GROUP BY region
),
order_stats AS (
  SELECT region, ROUND(AVG(CASE WHEN status = 'delivered' THEN revenue END), 0) AS avg_order_value,
         ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct
  FROM lines WHERE year = '2024' GROUP BY region
),
annual_targets AS (
  SELECT region, SUM(revenue_target) AS target_2024 FROM targets WHERE year = 2024 GROUP BY region
),
category_rank AS (
  SELECT region, category, ROW_NUMBER() OVER (PARTITION BY region ORDER BY SUM(revenue) DESC) AS position
  FROM lines WHERE year = '2024' AND status = 'delivered' GROUP BY region, category
)
SELECT r.region, r.revenue_2024,
       ROUND(100.0 * (r.revenue_2024 - r.revenue_2023) / r.revenue_2023, 1) AS growth_pct,
       ROUND(100.0 * r.revenue_2024 / t.target_2024, 1) AS target_attainment_pct,
       s.avg_order_value, s.return_rate_pct, k.category AS top_category,
       CASE WHEN r.revenue_2024 >= t.target_2024 THEN 'On track' WHEN r.revenue_2024 >= r.revenue_2023 THEN 'Growing, below target' ELSE 'Needs attention' END AS verdict
FROM regional AS r JOIN annual_targets AS t ON t.region = r.region JOIN order_stats AS s ON s.region = r.region
JOIN category_rank AS k ON k.region = r.region AND k.position = 1
ORDER BY r.revenue_2024 DESC;
```

Feedback: incorrect-output

```sql
WITH lines AS (
  SELECT o.order_id, o.status, c.region, substr(o.order_date, 1, 4) AS year, p.category,
         i.quantity * i.unit_price - i.discount AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.status <> 'cancelled'
),
regional AS (
  SELECT region,
         SUM(CASE WHEN year = '2024' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2024,
         SUM(CASE WHEN year = '2023' AND status = 'delivered' THEN revenue ELSE 0 END) AS revenue_2023
  FROM lines GROUP BY region
),
orders_2024 AS (
  SELECT region, order_id, status, SUM(revenue) AS revenue FROM lines WHERE year = '2024' GROUP BY region, order_id, status
),
order_stats AS (
  SELECT region, ROUND(AVG(CASE WHEN status = 'delivered' THEN revenue END), 0) AS avg_order_value,
         ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct
  FROM orders_2024 GROUP BY region
),
category_rank AS (
  SELECT region, category, ROW_NUMBER() OVER (PARTITION BY region ORDER BY SUM(revenue) DESC) AS position
  FROM lines WHERE year = '2024' AND status = 'delivered' GROUP BY region, category
)
SELECT r.region, r.revenue_2024,
       ROUND(100.0 * (r.revenue_2024 - r.revenue_2023) / r.revenue_2023, 1) AS growth_pct,
       ROUND(100.0 * r.revenue_2024 / t.revenue_target, 1) AS target_attainment_pct,
       s.avg_order_value, s.return_rate_pct, k.category AS top_category,
       CASE WHEN r.revenue_2024 >= t.revenue_target THEN 'On track' WHEN r.revenue_2024 >= r.revenue_2023 THEN 'Growing, below target' ELSE 'Needs attention' END AS verdict
FROM regional AS r JOIN targets AS t ON t.region = r.region AND t.year = 2024 AND t.quarter = 4
JOIN order_stats AS s ON s.region = r.region
JOIN category_rank AS k ON k.region = r.region AND k.position = 1
ORDER BY r.revenue_2024 DESC;
```
