---
id: da-day-165
title: Inventory turnover and days of supply
order: 165
difficulty: intermediate
topic: Product analytics
summary: Relate cost of goods sold to average stock, ignoring missed counts, and classify stock health.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute turnover and days of supply
  - Average only the observations that exist
prerequisites:
  - Day 117
  - Day 100
---

## Task

For the first quarter (90 days), finance has each SKU's cost of goods sold and four stock counts (in the starter query); a missed count is `NULL`. For each SKU compute:

- `avg_stock`: the average of the counts that were taken,
- `turnover`: cost of goods sold ÷ average stock, rounded to 2 decimal places,
- `days_of_supply`: 90 ÷ turnover, rounded to 1 decimal place (`NULL` when the turnover is 0),
- `status`: `'no sales'` when the turnover is 0, `'overstocked'` above 60 days, `'stockout risk'` below 15 days, otherwise `'healthy'`.

Sort by `sku`.

## Starter query

```sql
WITH quarter_cogs(sku, cogs) AS (
  VALUES ('S1', 9000), ('S2', 1200), ('S3', 12000), ('S4', 0), ('S5', 4500)
),
snapshots(sku, counted_on, stock_value) AS (
  VALUES
    ('S1', '2025-01-01', 3000), ('S1', '2025-02-01', 2800), ('S1', '2025-03-01', 3200), ('S1', '2025-04-01', 3000),
    ('S2', '2025-01-01', 5000), ('S2', '2025-02-01', 5200), ('S2', '2025-03-01', 4800), ('S2', '2025-04-01', NULL),
    ('S3', '2025-01-01', 800), ('S3', '2025-02-01', 600), ('S3', '2025-03-01', 700), ('S3', '2025-04-01', 500),
    ('S4', '2025-01-01', 400), ('S4', '2025-02-01', 400), ('S4', '2025-03-01', 400), ('S4', '2025-04-01', 400),
    ('S5', '2025-01-01', 1000), ('S5', '2025-02-01', 1500), ('S5', '2025-03-01', 1500), ('S5', '2025-04-01', 2000)
)
SELECT s.sku, s.counted_on, s.stock_value, c.cogs
FROM snapshots AS s
JOIN quarter_cogs AS c ON c.sku = s.sku
ORDER BY s.sku, s.counted_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `AVG(stock_value)` per SKU already ignores the missed count. Join the averages to `quarter_cogs`.
3. `turnover = 1.0 * cogs / avg_stock`; `days = CASE WHEN turnover > 0 THEN 90 / turnover END`. Classify in the order given, starting with `turnover = 0`.

## Solution

```sql
WITH quarter_cogs(sku, cogs) AS (
  VALUES ('S1', 9000), ('S2', 1200), ('S3', 12000), ('S4', 0), ('S5', 4500)
),
snapshots(sku, counted_on, stock_value) AS (
  VALUES
    ('S1', '2025-01-01', 3000), ('S1', '2025-02-01', 2800), ('S1', '2025-03-01', 3200), ('S1', '2025-04-01', 3000),
    ('S2', '2025-01-01', 5000), ('S2', '2025-02-01', 5200), ('S2', '2025-03-01', 4800), ('S2', '2025-04-01', NULL),
    ('S3', '2025-01-01', 800), ('S3', '2025-02-01', 600), ('S3', '2025-03-01', 700), ('S3', '2025-04-01', 500),
    ('S4', '2025-01-01', 400), ('S4', '2025-02-01', 400), ('S4', '2025-03-01', 400), ('S4', '2025-04-01', 400),
    ('S5', '2025-01-01', 1000), ('S5', '2025-02-01', 1500), ('S5', '2025-03-01', 1500), ('S5', '2025-04-01', 2000)
),
averages AS (
  SELECT sku, AVG(stock_value) AS avg_stock FROM snapshots GROUP BY sku
),
measures AS (
  SELECT c.sku, a.avg_stock, 1.0 * c.cogs / a.avg_stock AS turnover
  FROM quarter_cogs AS c
  JOIN averages AS a ON a.sku = c.sku
)
SELECT sku, avg_stock, ROUND(turnover, 2) AS turnover,
  ROUND(CASE WHEN turnover > 0 THEN 90 / turnover END, 1) AS days_of_supply,
  CASE
    WHEN turnover = 0 THEN 'no sales'
    WHEN 90 / turnover > 60 THEN 'overstocked'
    WHEN 90 / turnover < 15 THEN 'stockout risk'
    ELSE 'healthy'
  END AS status
FROM measures
ORDER BY sku;
```

## Expected result

| sku | avg_stock | turnover | days_of_supply | status |
| --- | --- | --- | --- | --- |
| S1 | 3000 | 3 | 30 | healthy |
| S2 | 5000 | 0.24 | 375 | overstocked |
| S3 | 650 | 18.46 | 4.9 | stockout risk |
| S4 | 400 | 0 | NULL | no sales |
| S5 | 1500 | 3 | 30 | healthy |

## Explanation

Turnover says how many times the average stock was sold during the period; days of supply turns that into "how long current stock lasts". S2 holds about 375 days of stock, a lot of cash tied up. S3 sells its average stock in under five days, so a delayed delivery means empty shelves.

S2's April count was missed. `AVG` skips the `NULL`, averaging the three counts taken (5,000). Treating the gap as zero would cut the average to 3,750 and make S2 look healthier than it is. S4 sold nothing: its turnover is 0, and days of supply is undefined rather than infinite.

**Common mistake:** `COALESCE(stock_value, 0)` inside the average, which invents an empty warehouse for every missed count.

## Wrong answers

Feedback: incorrect-output

```sql
WITH quarter_cogs(sku, cogs) AS ( VALUES ('S1', 9000), ('S2', 1200), ('S3', 12000), ('S4', 0), ('S5', 4500) ), snapshots(sku, counted_on, stock_value) AS ( VALUES ('S1', '2025-01-01', 3000), ('S1', '2025-02-01', 2800), ('S1', '2025-03-01', 3200), ('S1', '2025-04-01', 3000), ('S2', '2025-01-01', 5000), ('S2', '2025-02-01', 5200), ('S2', '2025-03-01', 4800), ('S2', '2025-04-01', NULL), ('S3', '2025-01-01', 800), ('S3', '2025-02-01', 600), ('S3', '2025-03-01', 700), ('S3', '2025-04-01', 500), ('S4', '2025-01-01', 400), ('S4', '2025-02-01', 400), ('S4', '2025-03-01', 400), ('S4', '2025-04-01', 400), ('S5', '2025-01-01', 1000), ('S5', '2025-02-01', 1500), ('S5', '2025-03-01', 1500), ('S5', '2025-04-01', 2000) ), averages AS (SELECT sku, AVG(COALESCE(stock_value, 0)) AS avg_stock FROM snapshots GROUP BY sku), measures AS (SELECT c.sku, a.avg_stock, 1.0 * c.cogs / a.avg_stock AS turnover FROM quarter_cogs AS c JOIN averages AS a ON a.sku = c.sku) SELECT sku, avg_stock, ROUND(turnover, 2) AS turnover, ROUND(CASE WHEN turnover > 0 THEN 90 / turnover END, 1) AS days_of_supply, CASE WHEN turnover = 0 THEN 'no sales' WHEN 90 / turnover > 60 THEN 'overstocked' WHEN 90 / turnover < 15 THEN 'stockout risk' ELSE 'healthy' END AS status FROM measures ORDER BY sku;
```
