---
id: da-day-355
title: Capstone (retail) 5: rebalancing staff hours
order: 355
difficulty: advanced
topic: Capstone
summary: Allocate March staff hours in proportion to each store's transactions and show the change per store.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Allocate a fixed total in proportion
  - Compare an allocation with the current one
prerequisites:
  - Day 204
  - Day 292
---

## Task

Same chain, last day of the retail capstone. The operations team wants to keep March's **total** staff hours but allocate them in proportion to each store's March **transactions**. For each store, return `store`, `transactions`, `current_hours`, `fair_hours` (total March hours × the store's share of March transactions, rounded to 0 decimal places), `change_hours` (fair − current, rounded to 0) and `transactions_per_hour` now (rounded to 2 decimal places). Sort by `change_hours` from most to fewest.

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
SELECT store, transactions, staff_hours FROM sales WHERE month = '2025-03' ORDER BY store;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter to March. The store's share of transactions is `1.0 * transactions / SUM(transactions) OVER ()`, and the hours to share out are `SUM(staff_hours) OVER ()`.
3. Fair hours = share × total hours; the changes add up to roughly zero (rounding aside), because total hours are kept.

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
march AS (
  SELECT store, transactions, staff_hours,
    1.0 * transactions / SUM(transactions) OVER () * SUM(staff_hours) OVER () AS fair
  FROM sales
  WHERE month = '2025-03'
)
SELECT store, transactions, staff_hours AS current_hours, ROUND(fair) AS fair_hours, ROUND(fair - staff_hours) AS change_hours,
  ROUND(1.0 * transactions / staff_hours, 2) AS transactions_per_hour
FROM march
ORDER BY change_hours DESC;
```

## Expected result

| store | transactions | current_hours | fair_hours | change_hours | transactions_per_hour |
| --- | --- | --- | --- | --- | --- |
| S1 | 6400 | 1480 | 1621 | 141 | 4.32 |
| S2 | 4500 | 1120 | 1140 | 20 | 4.02 |
| S3 | 4600 | 1190 | 1165 | -25 | 3.87 |
| S4 | 2900 | 870 | 734 | -136 | 3.33 |

## Explanation

Proportional allocation shares a fixed total by a driver, here transactions. Each store's share of March transactions times the total March hours gives its fair hours; the changes add up to zero (apart from rounding), because no hours are added or removed.

S1 handles 34.8% of transactions with 31.8% of hours and would gain 141 hours; S4, the newest store, has the opposite problem and would lose 136. In practice the team would temper this: a new store may need extra staff while it builds up, and fixed minimum staffing per shift does not scale with transactions.

**Common mistake:** sharing out the whole quarter's hours instead of March's. The fair hours are then about three times too high, and every store appears to need hundreds of extra hours.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, city, opened, sq_ft) AS ( VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500) ), sales(store, month, revenue, transactions, staff_hours) AS ( VALUES ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480), ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120), ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190), ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870) ), march AS (SELECT store, transactions, staff_hours, 1.0 * transactions / SUM(transactions) OVER () * (SELECT SUM(staff_hours) FROM sales) AS fair FROM sales WHERE month = '2025-03') SELECT store, transactions, staff_hours AS current_hours, ROUND(fair) AS fair_hours, ROUND(fair - staff_hours) AS change_hours, ROUND(1.0 * transactions / staff_hours, 2) AS transactions_per_hour FROM march ORDER BY change_hours DESC;
```
