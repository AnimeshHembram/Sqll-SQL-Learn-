---
id: da-day-309
title: Which first purchase leads to a second?
order: 309
difficulty: intermediate
topic: E-commerce
summary: Group customers by the category of their first order and compare how many ordered again.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Classify customers by their first purchase
  - Compare first and second purchases
prerequisites:
  - Day 161
  - Day 273
---

## Task

For each customer (starter query), find the category of their **first order** and whether they placed **any later order**. Group by first category and return `first_category`, `customers`, `repeat_customers`, `repeat_pct` (rounded to 1 decimal place) and `same_category_pct`: of the repeat customers, the share whose **second** order was in the same category (rounded to 1 decimal place, `NULL` with no repeat customers). Sort by `repeat_pct` from highest, then `first_category`.

## Starter query

```sql
WITH orders(order_id, customer, ordered_on, category) AS (
  VALUES
    (1, 'c1', '2025-01-02', 'Books'), (2, 'c1', '2025-02-10', 'Music'), (3, 'c2', '2025-01-05', 'Gifts'), (4, 'c3', '2025-01-08', 'Books'),
    (5, 'c3', '2025-01-30', 'Books'), (6, 'c4', '2025-01-12', 'Music'), (7, 'c5', '2025-01-15', 'Books'), (8, 'c6', '2025-01-20', 'Gifts'),
    (9, 'c6', '2025-03-02', 'Gifts'), (10, 'c7', '2025-01-22', 'Music'), (11, 'c8', '2025-01-25', 'Books'), (12, 'c8', '2025-02-01', 'Gifts')
)
SELECT customer, ordered_on, category
FROM orders
ORDER BY customer, ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number each customer's orders by date with `ROW_NUMBER()`. Pivot the first and second order's categories per customer with conditional `MAX`.
3. A repeat customer has a second order (`second_category IS NOT NULL`). Same category: `SUM(second_category = first_category)` over `NULLIF(SUM(second_category IS NOT NULL), 0)`.

## Solution

```sql
WITH orders(order_id, customer, ordered_on, category) AS (
  VALUES
    (1, 'c1', '2025-01-02', 'Books'), (2, 'c1', '2025-02-10', 'Music'), (3, 'c2', '2025-01-05', 'Gifts'), (4, 'c3', '2025-01-08', 'Books'),
    (5, 'c3', '2025-01-30', 'Books'), (6, 'c4', '2025-01-12', 'Music'), (7, 'c5', '2025-01-15', 'Books'), (8, 'c6', '2025-01-20', 'Gifts'),
    (9, 'c6', '2025-03-02', 'Gifts'), (10, 'c7', '2025-01-22', 'Music'), (11, 'c8', '2025-01-25', 'Books'), (12, 'c8', '2025-02-01', 'Gifts')
),
numbered AS (
  SELECT customer, category, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, order_id) AS n FROM orders
),
per_customer AS (
  SELECT customer,
    MAX(CASE WHEN n = 1 THEN category END) AS first_category,
    MAX(CASE WHEN n = 2 THEN category END) AS second_category
  FROM numbered
  GROUP BY customer
)
SELECT first_category, COUNT(*) AS customers, SUM(second_category IS NOT NULL) AS repeat_customers,
  ROUND(100.0 * SUM(second_category IS NOT NULL) / COUNT(*), 1) AS repeat_pct,
  ROUND(100.0 * SUM(second_category = first_category) / NULLIF(SUM(second_category IS NOT NULL), 0), 1) AS same_category_pct
FROM per_customer
GROUP BY first_category
ORDER BY repeat_pct DESC, first_category;
```

## Expected result

| first_category | customers | repeat_customers | repeat_pct | same_category_pct |
| --- | --- | --- | --- | --- |
| Books | 4 | 3 | 75 | 33.3 |
| Gifts | 2 | 1 | 50 | 100 |
| Music | 2 | 0 | 0 | NULL |

## Explanation

A customer's first purchase shapes what happens next. Three of the four customers who started with Books came back, but only one of them bought Books again: the others moved to Music and Gifts. Gifts buyers came back for more gifts, and neither of the Music starters returned.

Numbering each customer's orders and pivoting the first and second order's categories gives one row per customer, which makes both rates simple sums. `same_category_pct` is computed only over repeat customers, and is `NULL` for Music because there is nobody to compute it over.

**Common mistake:** grouping all orders by category. Every order of a customer is counted under its own category, so customers are counted several times, and "repeat customers" becomes the number of extra orders instead of the number of people who came back.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(order_id, customer, ordered_on, category) AS ( VALUES (1, 'c1', '2025-01-02', 'Books'), (2, 'c1', '2025-02-10', 'Music'), (3, 'c2', '2025-01-05', 'Gifts'), (4, 'c3', '2025-01-08', 'Books'), (5, 'c3', '2025-01-30', 'Books'), (6, 'c4', '2025-01-12', 'Music'), (7, 'c5', '2025-01-15', 'Books'), (8, 'c6', '2025-01-20', 'Gifts'), (9, 'c6', '2025-03-02', 'Gifts'), (10, 'c7', '2025-01-22', 'Music'), (11, 'c8', '2025-01-25', 'Books'), (12, 'c8', '2025-02-01', 'Gifts') ) SELECT category AS first_category, COUNT(DISTINCT customer) AS customers, COUNT(*) - COUNT(DISTINCT customer) AS repeat_customers, ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT customer)) / COUNT(DISTINCT customer), 1) AS repeat_pct, NULL AS same_category_pct FROM orders GROUP BY category ORDER BY repeat_pct DESC, first_category;
```
