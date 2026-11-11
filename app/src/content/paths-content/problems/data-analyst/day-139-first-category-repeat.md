---
id: da-day-139
title: Does the first purchase predict a return?
order: 139
difficulty: advanced
topic: Behavioural analytics
summary: Attach each customer's first-order attribute and compare repeat rates between groups.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Attach a first-event attribute to each customer
  - Compare outcome rates between groups
prerequisites:
  - Day 69
  - Day 112
---

## Task

Marketing asks whether the category of a customer's **first purchase** predicts whether they come back. Using the orders in the starter query:

- A customer's first purchase is their earliest order; if they bought several categories that day, take the category that comes first alphabetically.
- A customer **returned** if they ordered again on a **later day** (more items on the first day do not count).

For each first-purchase category, return `first_category`, `customers`, `returned` and `return_pct` (rounded to 1 decimal place). Sort by `return_pct` from highest to lowest, then `first_category`.

## Starter query

```sql
WITH shop_orders(customer, ordered_on, category) AS (
  VALUES
    ('k1', '2025-01-02', 'Books'), ('k1', '2025-01-20', 'Toys'),
    ('k2', '2025-01-03', 'Books'),
    ('k3', '2025-01-05', 'Games'), ('k3', '2025-01-05', 'Books'),
    ('k4', '2025-01-06', 'Games'), ('k4', '2025-02-01', 'Games'),
    ('k5', '2025-01-07', 'Games'),
    ('k6', '2025-01-08', 'Toys'), ('k6', '2025-01-09', 'Books'), ('k6', '2025-03-01', 'Toys'),
    ('k7', '2025-01-10', 'Toys')
)
SELECT customer, ordered_on, category
FROM shop_orders
ORDER BY customer, ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number each customer's orders with `ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, category)`; row 1 is the first purchase and its date is the first day.
3. A customer returned if `EXISTS` an order of theirs with `ordered_on > first_day`. Group the first purchases by category and count.

## Solution

```sql
WITH shop_orders(customer, ordered_on, category) AS (
  VALUES
    ('k1', '2025-01-02', 'Books'), ('k1', '2025-01-20', 'Toys'),
    ('k2', '2025-01-03', 'Books'),
    ('k3', '2025-01-05', 'Games'), ('k3', '2025-01-05', 'Books'),
    ('k4', '2025-01-06', 'Games'), ('k4', '2025-02-01', 'Games'),
    ('k5', '2025-01-07', 'Games'),
    ('k6', '2025-01-08', 'Toys'), ('k6', '2025-01-09', 'Books'), ('k6', '2025-03-01', 'Toys'),
    ('k7', '2025-01-10', 'Toys')
),
numbered AS (
  SELECT customer, ordered_on, category,
    ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, category) AS n
  FROM shop_orders
),
firsts AS (
  SELECT f.customer, f.category AS first_category,
    CASE WHEN EXISTS (
      SELECT 1 FROM shop_orders AS o WHERE o.customer = f.customer AND o.ordered_on > f.ordered_on
    ) THEN 1 ELSE 0 END AS returned
  FROM numbered AS f
  WHERE f.n = 1
)
SELECT first_category,
  COUNT(*) AS customers,
  SUM(returned) AS returned,
  ROUND(100.0 * SUM(returned) / COUNT(*), 1) AS return_pct
FROM firsts
GROUP BY first_category
ORDER BY return_pct DESC, first_category;
```

## Expected result

| first_category | customers | returned | return_pct |
| --- | --- | --- | --- |
| Games | 2 | 1 | 50 |
| Toys | 2 | 1 | 50 |
| Books | 3 | 1 | 33.3 |

## Explanation

Attaching a **first-event attribute** (first category, first channel, first device) to each customer and comparing outcomes is a standard way to find which entry points create loyal customers.

The rules matter on edge cases. k3 bought Games and Books on the same first day: the tie-break says their first category is Books, and since they never came back on a later day, they did not return. k6's later Books purchase does not change their first category, Toys.

With only two or three customers per group the differences mean little; in a real analysis, report the group sizes next to the rates, as the `customers` column does here.

**Common mistake:** treating any second order as a return. k3's second item on the same day would make Books look twice as good.

## Wrong answers

Feedback: incorrect-output

```sql
WITH shop_orders(customer, ordered_on, category) AS ( VALUES ('k1', '2025-01-02', 'Books'), ('k1', '2025-01-20', 'Toys'), ('k2', '2025-01-03', 'Books'), ('k3', '2025-01-05', 'Games'), ('k3', '2025-01-05', 'Books'), ('k4', '2025-01-06', 'Games'), ('k4', '2025-02-01', 'Games'), ('k5', '2025-01-07', 'Games'), ('k6', '2025-01-08', 'Toys'), ('k6', '2025-01-09', 'Books'), ('k6', '2025-03-01', 'Toys'), ('k7', '2025-01-10', 'Toys') ), numbered AS (SELECT customer, ordered_on, category, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, category) AS n, COUNT(*) OVER (PARTITION BY customer) AS orders FROM shop_orders), firsts AS (SELECT customer, category AS first_category, CASE WHEN orders > 1 THEN 1 ELSE 0 END AS returned FROM numbered WHERE n = 1) SELECT first_category, COUNT(*) AS customers, SUM(returned) AS returned, ROUND(100.0 * SUM(returned) / COUNT(*), 1) AS return_pct FROM firsts GROUP BY first_category ORDER BY return_pct DESC, first_category;
```
