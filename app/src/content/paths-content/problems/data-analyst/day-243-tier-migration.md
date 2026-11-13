---
id: da-day-243
title: How customers moved between value tiers
order: 243
difficulty: advanced
topic: Customer analytics
summary: Assign tiers in two quarters, include customers present in only one, and count every movement.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot two periods side by side
  - Count transitions between states
prerequisites:
  - Day 209
  - Day 76
---

## Task

Customers are tiered by quarterly spend (starter query): **gold** at 5,000 or more, **silver** at 1,000 or more, **bronze** below that, and **none** when they did not buy in the quarter. Compare 2024-Q4 with 2025-Q1 for every customer who bought in either quarter.

Return one row per movement that happened: `from_tier`, `to_tier`, `customers` and `movement` (`'up'`, `'down'` or `'same'`, using the order none < bronze < silver < gold). Sort by `from_tier` then `to_tier` in tier order from gold down to none.

## Starter query

```sql
WITH quarterly_spend(customer, quarter, spend) AS (
  VALUES
    ('c1', '2024-Q4', 5200), ('c1', '2025-Q1', 6100),
    ('c2', '2024-Q4', 4800), ('c2', '2025-Q1', 1500),
    ('c3', '2024-Q4', 1200), ('c3', '2025-Q1', 5300),
    ('c4', '2024-Q4', 300), ('c4', '2025-Q1', 900),
    ('c5', '2024-Q4', 1800),
    ('c6', '2025-Q1', 700),
    ('c7', '2024-Q4', 6000), ('c7', '2025-Q1', 5100),
    ('c8', '2024-Q4', 950), ('c8', '2025-Q1', 400)
)
SELECT customer, quarter, spend
FROM quarterly_spend
ORDER BY customer, quarter;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Put both quarters side by side per customer: `MAX(CASE WHEN quarter = '2024-Q4' THEN spend END)` and the same for 2025-Q1, grouped by customer. A customer missing from a quarter gets `NULL` there, which is tier `'none'`.
3. Turn each tier into a rank (none 0 … gold 3) to compare: higher rank in Q1 is `'up'`. Sort with `ORDER BY from_rank DESC, to_rank DESC`.

## Solution

```sql
WITH quarterly_spend(customer, quarter, spend) AS (
  VALUES
    ('c1', '2024-Q4', 5200), ('c1', '2025-Q1', 6100),
    ('c2', '2024-Q4', 4800), ('c2', '2025-Q1', 1500),
    ('c3', '2024-Q4', 1200), ('c3', '2025-Q1', 5300),
    ('c4', '2024-Q4', 300), ('c4', '2025-Q1', 900),
    ('c5', '2024-Q4', 1800),
    ('c6', '2025-Q1', 700),
    ('c7', '2024-Q4', 6000), ('c7', '2025-Q1', 5100),
    ('c8', '2024-Q4', 950), ('c8', '2025-Q1', 400)
),
pivoted AS (
  SELECT customer,
    MAX(CASE WHEN quarter = '2024-Q4' THEN spend END) AS q4,
    MAX(CASE WHEN quarter = '2025-Q1' THEN spend END) AS q1
  FROM quarterly_spend
  GROUP BY customer
),
tiered AS (
  SELECT customer,
    CASE WHEN q4 IS NULL OR q4 = 0 THEN 'none' WHEN q4 >= 5000 THEN 'gold' WHEN q4 >= 1000 THEN 'silver' ELSE 'bronze' END AS from_tier,
    CASE WHEN q1 IS NULL OR q1 = 0 THEN 'none' WHEN q1 >= 5000 THEN 'gold' WHEN q1 >= 1000 THEN 'silver' ELSE 'bronze' END AS to_tier
  FROM pivoted
),
ranked AS (
  SELECT from_tier, to_tier,
    CASE from_tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END AS from_rank,
    CASE to_tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END AS to_rank
  FROM tiered
)
SELECT from_tier, to_tier, COUNT(*) AS customers,
  CASE WHEN to_rank > from_rank THEN 'up' WHEN to_rank < from_rank THEN 'down' ELSE 'same' END AS movement
FROM ranked
GROUP BY from_tier, to_tier, from_rank, to_rank
ORDER BY from_rank DESC, to_rank DESC;
```

## Expected result

| from_tier | to_tier | customers | movement |
| --- | --- | --- | --- |
| gold | gold | 2 | same |
| silver | gold | 1 | up |
| silver | silver | 1 | same |
| silver | none | 1 | down |
| bronze | bronze | 2 | same |
| none | bronze | 1 | up |

## Explanation

A migration table counts how many customers moved from each tier to each other tier. Putting the two quarters side by side per customer (conditional `MAX` grouped by customer) gives `NULL` for a quarter in which they did not buy, which the tier rule turns into `'none'`. That keeps the two most important movements in the report: c5 bought in Q4 but not in Q1 (silver to none), and c6 is new in Q1 (none to bronze).

Ranking the tiers numerically makes the comparison simple: higher in Q1 is up. c3 jumped from silver to gold; c2 stayed silver although their spend fell from 4,800 to 1,500, because tiers hide movement inside a band. Sorting by the ranks (not the names) shows the table in business order, from gold down.

**Common mistake:** pairing the quarters with an inner self-join. Customers present in only one quarter drop out, and the report misses both the lapsed and the new customers.

## Wrong answers

Feedback: missing-rows

```sql
WITH quarterly_spend(customer, quarter, spend) AS ( VALUES ('c1', '2024-Q4', 5200), ('c1', '2025-Q1', 6100), ('c2', '2024-Q4', 4800), ('c2', '2025-Q1', 1500), ('c3', '2024-Q4', 1200), ('c3', '2025-Q1', 5300), ('c4', '2024-Q4', 300), ('c4', '2025-Q1', 900), ('c5', '2024-Q4', 1800), ('c6', '2025-Q1', 700), ('c7', '2024-Q4', 6000), ('c7', '2025-Q1', 5100), ('c8', '2024-Q4', 950), ('c8', '2025-Q1', 400) ), pivoted AS (SELECT a.customer, a.spend AS q4, b.spend AS q1 FROM quarterly_spend AS a JOIN quarterly_spend AS b ON b.customer = a.customer AND b.quarter = '2025-Q1' WHERE a.quarter = '2024-Q4'), ranked AS (SELECT CASE WHEN q4 IS NULL OR q4 = 0 THEN 'none' WHEN q4 >= 5000 THEN 'gold' WHEN q4 >= 1000 THEN 'silver' ELSE 'bronze' END AS from_tier, CASE WHEN q1 IS NULL OR q1 = 0 THEN 'none' WHEN q1 >= 5000 THEN 'gold' WHEN q1 >= 1000 THEN 'silver' ELSE 'bronze' END AS to_tier FROM pivoted), r2 AS (SELECT from_tier, to_tier, CASE from_tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END AS from_rank, CASE to_tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END AS to_rank FROM ranked) SELECT from_tier, to_tier, COUNT(*) AS customers, CASE WHEN to_rank > from_rank THEN 'up' WHEN to_rank < from_rank THEN 'down' ELSE 'same' END AS movement FROM r2 GROUP BY from_tier, to_tier, from_rank, to_rank ORDER BY from_rank DESC, to_rank DESC;
```
