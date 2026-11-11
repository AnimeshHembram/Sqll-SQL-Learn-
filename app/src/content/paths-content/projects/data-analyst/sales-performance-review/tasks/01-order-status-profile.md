---
id: spr-01-order-status-profile
title: Profile orders by year and status
order: 1
difficulty: beginner
topic: Data profiling
summary: Count the orders in each year by status, with each status's share of the year, before trusting any revenue figure.
module: know-the-data
duration: 15
dataset: kalaa-home
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Profile a table before analysing it
  - Use a window function over grouped results
prerequisites:
  - GROUP BY with more than one column
  - Window functions (SUM OVER)
---

## Task

Before you report a single rupee, find out what the `orders` table actually holds. Not every order is a sale: some were **cancelled** before shipping and some were **returned**.

For each year (`year`, the first four characters of `order_date`) and `status`, return the number of `orders` and `share_pct`: that status's share of the year's orders, as a percentage rounded to one decimal place.

Sort by `year`, then `status`.

## Starter query

```sql
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status;
```

## Hints

1. Group by two things: the year and the status. `substr(order_date, 1, 4)` gives the year.
2. The share needs the year's total next to each row. A window function over the grouped counts can give it: `SUM(COUNT(*)) OVER (PARTITION BY ...)`.
3. Multiply by `100.0` (not `100`) before dividing, so SQLite does not use whole-number division, then `ROUND(..., 1)`.

## Solution

```sql
SELECT substr(order_date, 1, 4) AS year,
       status,
       COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY substr(order_date, 1, 4)), 1) AS share_pct
FROM orders
GROUP BY year, status
ORDER BY year, status;
```

## Expected result

| year | status | orders | share_pct |
| --- | --- | --- | --- |
| 2023 | cancelled | 14 | 5.4 |
| 2023 | delivered | 225 | 86.5 |
| 2023 | returned | 21 | 8.1 |
| 2024 | cancelled | 17 | 5 |
| 2024 | delivered | 292 | 85.9 |
| 2024 | returned | 31 | 9.1 |

## Explanation

`GROUP BY year, status` gives one count per combination. The window `SUM(COUNT(*)) OVER (PARTITION BY year)` runs after grouping, so it adds up the grouped counts of the same year and puts that total on every row of the year.

**What it tells the business:** about 86% of orders in each year were delivered. Roughly 5% were cancelled and 8 to 9% returned, and the return share rose from 8.1% to 9.1% in 2024. From here on, **net revenue** means delivered orders only: a cancelled order never earned money and a returned one was refunded.

**Common mistake:** dividing by the count of all orders in both years (`SUM(COUNT(*)) OVER ()`). Each year's shares should add up to 100%.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT substr(order_date, 1, 4) AS year, status, COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM orders
GROUP BY year, status
ORDER BY year, status;
```

Feedback: incorrect-output

```sql
SELECT substr(order_date, 1, 4) AS year, status, COUNT(*) AS orders,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY substr(order_date, 1, 4)), 1) AS share_pct
FROM orders
GROUP BY year, status
ORDER BY year, status;
```

Feedback: wrong-order

```sql
SELECT substr(order_date, 1, 4) AS year, status, COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY substr(order_date, 1, 4)), 1) AS share_pct
FROM orders
GROUP BY year, status
ORDER BY year, orders DESC;
```
