---
id: spr-04-monthly-trend
title: Monthly revenue trend for 2024
order: 4
difficulty: intermediate
topic: Trends
summary: Show 2024 net revenue by month with the change from the previous month and the running year-to-date total.
module: revenue-and-growth
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate month-over-month change
  - Build a running total with a window
prerequisites:
  - Date text functions
  - LAG
  - Window frames
---

## Task

Finance wants the 2024 trend for the board pack. For each month of 2024 (`month`, written `YYYY-MM`), return:

- `net_revenue` (delivered orders only),
- `mom_change_pct`: the change from the previous month as a percentage, rounded to one decimal (NULL for January),
- `ytd_revenue`: the running total from January up to and including that month.

Sort by `month`.

## Starter query

```sql
SELECT substr(o.order_date, 1, 7) AS month,
       SUM(i.quantity * i.unit_price - i.discount) AS net_revenue
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY month
ORDER BY month;
```

## Hints

1. Start from the starter query, keep only 2024 (`o.order_date BETWEEN '2024-01-01' AND '2024-12-31'`) and put it in a CTE.
2. Month-over-month change uses `LAG(net_revenue) OVER (ORDER BY month)`.
3. A running total is `SUM(net_revenue) OVER (ORDER BY month)`: with `ORDER BY` inside `OVER`, the window runs from the first row up to the current one.

## Solution

```sql
WITH monthly AS (
  SELECT substr(o.order_date, 1, 7) AS month,
         SUM(i.quantity * i.unit_price - i.discount) AS net_revenue
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY month
)
SELECT month,
       net_revenue,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY month)) / LAG(net_revenue) OVER (ORDER BY month), 1) AS mom_change_pct,
       SUM(net_revenue) OVER (ORDER BY month) AS ytd_revenue
FROM monthly
ORDER BY month;
```

## Expected result

| month | net_revenue | mom_change_pct | ytd_revenue |
| --- | --- | --- | --- |
| 2024-01 | 120516 | NULL | 120516 |
| 2024-02 | 49865 | -58.6 | 170381 |
| 2024-03 | 79586 | 59.6 | 249967 |
| 2024-04 | 105397 | 32.4 | 355364 |
| 2024-05 | 95738 | -9.2 | 451102 |
| 2024-06 | 98588 | 3 | 549690 |
| 2024-07 | 148246 | 50.4 | 697936 |
| 2024-08 | 114391 | -22.8 | 812327 |
| 2024-09 | 152429 | 33.3 | 964756 |
| 2024-10 | 213101 | 39.8 | 1177857 |
| 2024-11 | 196027 | -8 | 1373884 |
| 2024-12 | 169352 | -13.6 | 1543236 |

## Explanation

Both window functions read the `monthly` CTE in month order: `LAG` looks one row back, and `SUM ... OVER (ORDER BY month)` accumulates. The December running total equals the 2024 net revenue from Task 3 (₹15,43,236), which is a quick way to check your work.

**What it tells the business:** month-on-month change is noisy with a few hundred orders a year, so read the shape rather than single months. October and November (Diwali and the wedding season) are the two strongest months, as in 2023, and the running total passes ₹10 lakh in October. Small samples swing: a single furniture order can move a month by 10% or more.

**Common mistake:** `SUM(net_revenue) OVER ()` without `ORDER BY` gives the full-year total on every row instead of a running total.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly AS (
  SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price - i.discount) AS net_revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY month
)
SELECT month, net_revenue,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY month)) / LAG(net_revenue) OVER (ORDER BY month), 1) AS mom_change_pct,
       SUM(net_revenue) OVER () AS ytd_revenue
FROM monthly ORDER BY month;
```

Feedback: incorrect-output

```sql
WITH monthly AS (
  SELECT substr(o.order_date, 1, 7) AS month, SUM(i.quantity * i.unit_price - i.discount) AS net_revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY month
)
SELECT month, net_revenue,
       ROUND(100.0 * (net_revenue - LAG(net_revenue) OVER (ORDER BY month)) / LAG(net_revenue) OVER (ORDER BY month), 1) AS mom_change_pct,
       SUM(net_revenue) OVER (ORDER BY month) AS ytd_revenue
FROM monthly ORDER BY month;
```
