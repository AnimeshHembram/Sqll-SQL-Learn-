---
id: da-day-353
title: Capstone (retail) 3: city share and store share within a city
order: 353
difficulty: intermediate
topic: Capstone
summary: Report each store's share of its city and of the chain, and each city's share of the chain.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute shares at two levels
  - Use several windows over the same rows
prerequisites:
  - Day 42
  - Day 242
---

## Task

Same chain. For each store, return `city`, `store`, `revenue` (quarter total), `share_of_city_pct`, `share_of_chain_pct` and `city_share_of_chain_pct` (the store's city's share of the whole chain), all percentages rounded to 1 decimal place. Sort by `city_share_of_chain_pct` from highest, then `revenue` from highest.

## Starter query

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
)
SELECT s.city, x.store, SUM(x.revenue) AS revenue
FROM sales AS x
JOIN stores AS s ON s.store = x.store
GROUP BY s.city, x.store;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Total revenue per store with its city, in a CTE.
3. Three windows over those rows: `SUM(revenue) OVER (PARTITION BY city)` for the city total and `SUM(revenue) OVER ()` for the chain total; the city's share is the first divided by the second.

## Solution

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
),
store_totals AS (
  SELECT s.city, x.store, SUM(x.revenue) AS revenue
  FROM sales AS x
  JOIN stores AS s ON s.store = x.store
  GROUP BY s.city, x.store
),
shares AS (
  SELECT city, store, revenue,
    100.0 * revenue / SUM(revenue) OVER (PARTITION BY city) AS share_city,
    100.0 * revenue / SUM(revenue) OVER () AS share_chain,
    100.0 * SUM(revenue) OVER (PARTITION BY city) / SUM(revenue) OVER () AS city_share
  FROM store_totals
)
SELECT city, store, revenue, ROUND(share_city, 1) AS share_of_city_pct, ROUND(share_chain, 1) AS share_of_chain_pct,
  ROUND(city_share, 1) AS city_share_of_chain_pct
FROM shares
ORDER BY city_share_of_chain_pct DESC, revenue DESC;
```

## Expected result

| city | store | revenue | share_of_city_pct | share_of_chain_pct | city_share_of_chain_pct |
| --- | --- | --- | --- | --- | --- |
| Pune | S1 | 5470000 | 63.9 | 39.9 | 62.4 |
| Pune | S2 | 3090000 | 36.1 | 22.5 | 62.4 |
| Nagpur | S3 | 3580000 | 100 | 26.1 | 26.1 |
| Nashik | S4 | 1570000 | 100 | 11.5 | 11.5 |

## Explanation

Shares at two levels answer two questions: which city matters most to the chain, and which store matters most within its city. Pune brings 62.4% of the chain's revenue, and within Pune, S1 brings almost two thirds. Several windows over the same rows give all three shares in one pass: one partitioned by city, one over everything.

Nagpur and Nashik each have one store, so those stores have 100% of their city. Sorting by the city's share first, then by store revenue, groups the stores by city in order of importance.

**Common mistake:** using the chain total for the share of city. Every store's share of city equals its share of chain, and the within-city comparison is lost.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, city, opened, sq_ft) AS ( VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500) ), sales(store, month, revenue, transactions, staff_hours) AS ( VALUES ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480), ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120), ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190), ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870) ), store_totals AS (SELECT s.city, x.store, SUM(x.revenue) AS revenue FROM sales AS x JOIN stores AS s ON s.store = x.store GROUP BY s.city, x.store), shares AS (SELECT city, store, revenue, 100.0 * revenue / SUM(revenue) OVER () AS share_city, 100.0 * revenue / SUM(revenue) OVER () AS share_chain, 100.0 * SUM(revenue) OVER (PARTITION BY city) / SUM(revenue) OVER () AS city_share FROM store_totals) SELECT city, store, revenue, ROUND(share_city, 1) AS share_of_city_pct, ROUND(share_chain, 1) AS share_of_chain_pct, ROUND(city_share, 1) AS city_share_of_chain_pct FROM shares ORDER BY city_share_of_chain_pct DESC, revenue DESC;
```
