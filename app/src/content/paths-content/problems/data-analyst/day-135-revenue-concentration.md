---
id: da-day-135
title: How concentrated is revenue?
order: 135
difficulty: advanced
topic: Financial analysis
summary: Measure dependence on a few customers with top-N shares and the Herfindahl-Hirschman index.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute shares of a group total with a window
  - Summarise concentration with HHI
prerequisites:
  - Day 50
  - Day 42
---

## Task

A region that depends on one customer is risky. For each region (in the starter query), return `region`, `customers`, `top1_pct` (the biggest customer's share of the region's revenue, as a percentage rounded to 1 decimal place), `top2_pct` (the two biggest together) and `hhi`: the **Herfindahl-Hirschman index**, the sum of every customer's squared share with shares written as percentages (so a region with one customer scores 10,000), rounded to a whole number. Sort by `hhi` from highest to lowest.

## Starter query

```sql
WITH customer_revenue(region, customer, revenue) AS (
  VALUES
    ('North', 'A', 500), ('North', 'B', 300), ('North', 'C', 200),
    ('South', 'D', 900), ('South', 'E', 50), ('South', 'F', 50),
    ('West', 'G', 400), ('West', 'H', 400)
)
SELECT region, customer, revenue
FROM customer_revenue
ORDER BY region, revenue DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Each customer's share in percent: `100.0 * revenue / SUM(revenue) OVER (PARTITION BY region)`. Number them with `ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, customer)`.
3. Group by region: `SUM(CASE WHEN position = 1 THEN share END)`, `SUM(CASE WHEN position <= 2 THEN share END)` and `ROUND(SUM(share * share))`.

## Solution

```sql
WITH customer_revenue(region, customer, revenue) AS (
  VALUES
    ('North', 'A', 500), ('North', 'B', 300), ('North', 'C', 200),
    ('South', 'D', 900), ('South', 'E', 50), ('South', 'F', 50),
    ('West', 'G', 400), ('West', 'H', 400)
),
shares AS (
  SELECT region, customer,
    100.0 * revenue / SUM(revenue) OVER (PARTITION BY region) AS share,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, customer) AS position
  FROM customer_revenue
)
SELECT region,
  COUNT(*) AS customers,
  ROUND(SUM(CASE WHEN position = 1 THEN share END), 1) AS top1_pct,
  ROUND(SUM(CASE WHEN position <= 2 THEN share END), 1) AS top2_pct,
  ROUND(SUM(share * share)) AS hhi
FROM shares
GROUP BY region
ORDER BY hhi DESC;
```

## Expected result

| region | customers | top1_pct | top2_pct | hhi |
| --- | --- | --- | --- | --- |
| South | 3 | 90 | 95 | 8150 |
| West | 2 | 50 | 100 | 5000 |
| North | 3 | 50 | 80 | 3800 |

## Explanation

Top-N shares are easy to explain; the HHI summarises the whole distribution in one number, and squaring makes large shares dominate. Regulators and analysts read it roughly as: below 1,500 competitive, above 2,500 highly concentrated.

The South gets 90% of its revenue from one customer (HHI 8,150). North and West both have a top customer at 50%, but the West's revenue is split evenly between just two customers, so its HHI (5,000) is higher than the North's (3,800), where the rest is spread more widely.

**Common mistake:** dividing by the total across all regions instead of each region's own total (`OVER ()` instead of `OVER (PARTITION BY region)`), which makes every share and index meaningless.

## Wrong answers

Feedback: incorrect-output

```sql
WITH customer_revenue(region, customer, revenue) AS ( VALUES ('North', 'A', 500), ('North', 'B', 300), ('North', 'C', 200), ('South', 'D', 900), ('South', 'E', 50), ('South', 'F', 50), ('West', 'G', 400), ('West', 'H', 400) ), shares AS (SELECT region, customer, 100.0 * revenue / SUM(revenue) OVER () AS share, ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, customer) AS position FROM customer_revenue) SELECT region, COUNT(*) AS customers, ROUND(SUM(CASE WHEN position = 1 THEN share END), 1) AS top1_pct, ROUND(SUM(CASE WHEN position <= 2 THEN share END), 1) AS top2_pct, ROUND(SUM(share * share)) AS hhi FROM shares GROUP BY region ORDER BY hhi DESC;
```
