---
id: da-day-301
title: Lifetime value against acquisition cost by channel
order: 301
difficulty: advanced
topic: Marketing analytics
summary: Compare each channel's 12-month customer margin with what it cost to acquire them.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure value over a fixed window
  - Compare value with acquisition cost
prerequisites:
  - Day 148
  - Day 131
---

## Task

Customers acquired in July and August 2024 came through three channels (starter query). For each channel, compute:

- `customers` and `cac` (acquisition spend ÷ customers),
- `ltv_12m`: average margin per customer from orders within **12 months** of acquisition (from `acquired_on` up to the day before the anniversary), 0 for none,
- `ltv_to_cac` (rounded to 2 decimal places) and `payback`: `'yes'` when the ratio is at least 3, the common rule of thumb, otherwise `'no'`.

Round money to 2 decimal places. Sort by `ltv_to_cac` from highest.

## Starter query

```sql
WITH customers(customer, channel, acquired_on) AS (
  VALUES
    ('c1', 'search', '2024-07-05'), ('c2', 'search', '2024-07-20'), ('c3', 'search', '2024-08-02'), ('c4', 'social', '2024-07-11'),
    ('c5', 'social', '2024-07-25'), ('c6', 'social', '2024-08-15'), ('c7', 'social', '2024-08-30'), ('c8', 'referral', '2024-07-14'),
    ('c9', 'referral', '2024-08-08')
),
orders(customer, ordered_on, margin) AS (
  VALUES
    ('c1', '2024-07-05', 800), ('c1', '2024-09-10', 600), ('c1', '2025-01-15', 700), ('c2', '2024-07-20', 500),
    ('c3', '2024-08-02', 900), ('c3', '2024-11-30', 400), ('c4', '2024-07-11', 300), ('c5', '2024-07-25', 350),
    ('c5', '2024-12-01', 200), ('c6', '2024-08-15', 250), ('c7', '2024-08-30', 300), ('c8', '2024-07-14', 700),
    ('c8', '2024-10-01', 650), ('c8', '2025-02-20', 900), ('c8', '2025-09-01', 500), ('c9', '2024-08-08', 600)
),
spend(channel, acquisition_spend) AS (
  VALUES ('search', 3000), ('social', 3200), ('referral', 800)
)
SELECT c.customer, c.channel, c.acquired_on, o.ordered_on, o.margin
FROM customers AS c
LEFT JOIN orders AS o ON o.customer = c.customer
ORDER BY c.customer, o.ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per customer, sum margin with a `LEFT JOIN` whose condition holds the window: `o.ordered_on >= c.acquired_on AND o.ordered_on < date(c.acquired_on, '+12 months')`.
3. Group customers by channel (`AVG` of their 12-month margin), join `spend` for CAC, and divide.

## Solution

```sql
WITH customers(customer, channel, acquired_on) AS (
  VALUES
    ('c1', 'search', '2024-07-05'), ('c2', 'search', '2024-07-20'), ('c3', 'search', '2024-08-02'), ('c4', 'social', '2024-07-11'),
    ('c5', 'social', '2024-07-25'), ('c6', 'social', '2024-08-15'), ('c7', 'social', '2024-08-30'), ('c8', 'referral', '2024-07-14'),
    ('c9', 'referral', '2024-08-08')
),
orders(customer, ordered_on, margin) AS (
  VALUES
    ('c1', '2024-07-05', 800), ('c1', '2024-09-10', 600), ('c1', '2025-01-15', 700), ('c2', '2024-07-20', 500),
    ('c3', '2024-08-02', 900), ('c3', '2024-11-30', 400), ('c4', '2024-07-11', 300), ('c5', '2024-07-25', 350),
    ('c5', '2024-12-01', 200), ('c6', '2024-08-15', 250), ('c7', '2024-08-30', 300), ('c8', '2024-07-14', 700),
    ('c8', '2024-10-01', 650), ('c8', '2025-02-20', 900), ('c8', '2025-09-01', 500), ('c9', '2024-08-08', 600)
),
spend(channel, acquisition_spend) AS (
  VALUES ('search', 3000), ('social', 3200), ('referral', 800)
),
per_customer AS (
  SELECT c.customer, c.channel, COALESCE(SUM(o.margin), 0) AS margin_12m
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer = c.customer
    AND o.ordered_on >= c.acquired_on AND o.ordered_on < date(c.acquired_on, '+12 months')
  GROUP BY c.customer, c.channel
),
per_channel AS (
  SELECT p.channel, COUNT(*) AS customers, AVG(p.margin_12m) AS ltv, 1.0 * s.acquisition_spend / COUNT(*) AS cac
  FROM per_customer AS p
  JOIN spend AS s ON s.channel = p.channel
  GROUP BY p.channel, s.acquisition_spend
)
SELECT channel, customers, ROUND(cac, 2) AS cac, ROUND(ltv, 2) AS ltv_12m, ROUND(ltv / cac, 2) AS ltv_to_cac,
  CASE WHEN ltv / cac >= 3 THEN 'yes' ELSE 'no' END AS payback
FROM per_channel
ORDER BY ltv_to_cac DESC;
```

## Expected result

| channel | customers | cac | ltv_12m | ltv_to_cac | payback |
| --- | --- | --- | --- | --- | --- |
| referral | 2 | 400 | 1425 | 3.56 | yes |
| search | 3 | 1000 | 1300 | 1.3 | no |
| social | 4 | 800 | 350 | 0.44 | no |

## Explanation

LTV:CAC compares what a customer is worth with what it cost to acquire them; a ratio of 3 or more is a common sign that a channel pays for itself with room for overheads. Referral customers cost 400 each and brought 1,425 of margin in their first year (3.56 times their cost); social customers cost 800 and brought only 350.

The 12-month window keeps the channels comparable: c8's order in September 2025 falls outside their first year and does not count, while c1's January 2025 order does. Putting the window in the `LEFT JOIN` condition keeps customers with no qualifying orders in the average, so a channel is not flattered by dropping its weakest customers.

**Common mistake:** counting all orders, with no window. Customers acquired earlier have had longer to buy, so the comparison rewards old cohorts rather than good channels; here referral's value rises to 1,675 on one late order.

## Wrong answers

Feedback: incorrect-output

```sql
WITH customers(customer, channel, acquired_on) AS ( VALUES ('c1', 'search', '2024-07-05'), ('c2', 'search', '2024-07-20'), ('c3', 'search', '2024-08-02'), ('c4', 'social', '2024-07-11'), ('c5', 'social', '2024-07-25'), ('c6', 'social', '2024-08-15'), ('c7', 'social', '2024-08-30'), ('c8', 'referral', '2024-07-14'), ('c9', 'referral', '2024-08-08') ), orders(customer, ordered_on, margin) AS ( VALUES ('c1', '2024-07-05', 800), ('c1', '2024-09-10', 600), ('c1', '2025-01-15', 700), ('c2', '2024-07-20', 500), ('c3', '2024-08-02', 900), ('c3', '2024-11-30', 400), ('c4', '2024-07-11', 300), ('c5', '2024-07-25', 350), ('c5', '2024-12-01', 200), ('c6', '2024-08-15', 250), ('c7', '2024-08-30', 300), ('c8', '2024-07-14', 700), ('c8', '2024-10-01', 650), ('c8', '2025-02-20', 900), ('c8', '2025-09-01', 500), ('c9', '2024-08-08', 600) ), spend(channel, acquisition_spend) AS ( VALUES ('search', 3000), ('social', 3200), ('referral', 800) ), per_customer AS (SELECT c.customer, c.channel, COALESCE(SUM(o.margin), 0) AS margin_12m FROM customers AS c LEFT JOIN orders AS o ON o.customer = c.customer GROUP BY c.customer, c.channel), per_channel AS (SELECT p.channel, COUNT(*) AS customers, AVG(p.margin_12m) AS ltv, 1.0 * s.acquisition_spend / COUNT(*) AS cac FROM per_customer AS p JOIN spend AS s ON s.channel = p.channel GROUP BY p.channel, s.acquisition_spend) SELECT channel, customers, ROUND(cac, 2) AS cac, ROUND(ltv, 2) AS ltv_12m, ROUND(ltv / cac, 2) AS ltv_to_cac, CASE WHEN ltv / cac >= 3 THEN 'yes' ELSE 'no' END AS payback FROM per_channel ORDER BY ltv_to_cac DESC;
```
