---
id: da-day-161
title: What do customers buy on their second visit?
order: 161
difficulty: advanced
topic: Behavioural analytics
summary: Build a transition table from the first to the second purchase day, one category per day.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Reduce events to one per period before sequencing
  - Build a transition table with shares
prerequisites:
  - Day 139
  - Day 158
---

## Task

Merchandising wants to know what customers buy **on their second shopping day**, depending on their first (data in the starter query). Use one category per customer per day: if a customer bought several categories on one day, use the one that comes first alphabetically. Customers with only one shopping day are left out.

Return `from_category` (first day), `to_category` (second day), `customers` and `pct_of_from` (share of customers with that first category, rounded to 1 decimal place). Sort by `from_category`, then `customers` from most to fewest, then `to_category`.

## Starter query

```sql
WITH purchases(customer, bought_on, category) AS (
  VALUES
    ('p1', '2025-01-01', 'Books'), ('p1', '2025-01-05', 'Toys'),
    ('p2', '2025-01-02', 'Games'), ('p2', '2025-01-02', 'Books'), ('p2', '2025-01-10', 'Books'),
    ('p3', '2025-01-03', 'Games'), ('p3', '2025-01-04', 'Books'),
    ('p4', '2025-01-03', 'Books'), ('p4', '2025-01-20', 'Toys'), ('p4', '2025-02-01', 'Games'),
    ('p5', '2025-01-04', 'Toys'),
    ('p6', '2025-01-05', 'Games'), ('p6', '2025-01-06', 'Games'),
    ('p7', '2025-01-06', 'Books'), ('p7', '2025-01-07', 'Games')
)
SELECT customer, bought_on, category
FROM purchases
ORDER BY customer, bought_on, category;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. One row per customer and day: `SELECT customer, bought_on, MIN(category) AS category FROM purchases GROUP BY customer, bought_on`. Then number the days per customer with `ROW_NUMBER()`.
3. Pivot days 1 and 2 with `MAX(CASE WHEN day_no = 1 THEN category END)` and `MAX(CASE WHEN day_no = 2 THEN category END)`, keep customers with a second day, then count per pair; `SUM(COUNT(*)) OVER (PARTITION BY from_category)` is the denominator.

## Solution

```sql
WITH purchases(customer, bought_on, category) AS (
  VALUES
    ('p1', '2025-01-01', 'Books'), ('p1', '2025-01-05', 'Toys'),
    ('p2', '2025-01-02', 'Games'), ('p2', '2025-01-02', 'Books'), ('p2', '2025-01-10', 'Books'),
    ('p3', '2025-01-03', 'Games'), ('p3', '2025-01-04', 'Books'),
    ('p4', '2025-01-03', 'Books'), ('p4', '2025-01-20', 'Toys'), ('p4', '2025-02-01', 'Games'),
    ('p5', '2025-01-04', 'Toys'),
    ('p6', '2025-01-05', 'Games'), ('p6', '2025-01-06', 'Games'),
    ('p7', '2025-01-06', 'Books'), ('p7', '2025-01-07', 'Games')
),
days AS (
  SELECT customer, bought_on, MIN(category) AS category FROM purchases GROUP BY customer, bought_on
),
numbered AS (
  SELECT customer, category, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY bought_on) AS day_no FROM days
),
pairs AS (
  SELECT customer,
    MAX(CASE WHEN day_no = 1 THEN category END) AS from_category,
    MAX(CASE WHEN day_no = 2 THEN category END) AS to_category
  FROM numbered
  GROUP BY customer
)
SELECT from_category, to_category, COUNT(*) AS customers,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY from_category), 1) AS pct_of_from
FROM pairs
WHERE to_category IS NOT NULL
GROUP BY from_category, to_category
ORDER BY from_category, customers DESC, to_category;
```

## Expected result

| from_category | to_category | customers | pct_of_from |
| --- | --- | --- | --- |
| Books | Toys | 2 | 50 |
| Books | Books | 1 | 25 |
| Books | Games | 1 | 25 |
| Games | Books | 1 | 50 |
| Games | Games | 1 | 50 |

## Explanation

A transition table shows where customers go next, which is more actionable than overall popularity: half the customers who start with Books come back for Toys, a strong cue for a follow-up email.

The unit of analysis decides the result. p2 bought Games and Books on the same first day; reducing each day to one category (Books, alphabetically) before numbering means p2's **second day** is the 10 January Books purchase, not the Games line from the same morning. p4's third day is ignored, and p5, who shopped only once, is left out.

**Common mistake:** numbering purchase rows instead of purchase days, which treats a second item in the same basket as a return visit.

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchases(customer, bought_on, category) AS ( VALUES ('p1', '2025-01-01', 'Books'), ('p1', '2025-01-05', 'Toys'), ('p2', '2025-01-02', 'Games'), ('p2', '2025-01-02', 'Books'), ('p2', '2025-01-10', 'Books'), ('p3', '2025-01-03', 'Games'), ('p3', '2025-01-04', 'Books'), ('p4', '2025-01-03', 'Books'), ('p4', '2025-01-20', 'Toys'), ('p4', '2025-02-01', 'Games'), ('p5', '2025-01-04', 'Toys'), ('p6', '2025-01-05', 'Games'), ('p6', '2025-01-06', 'Games'), ('p7', '2025-01-06', 'Books'), ('p7', '2025-01-07', 'Games') ), numbered AS (SELECT customer, category, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY bought_on, category) AS day_no FROM purchases), pairs AS (SELECT customer, MAX(CASE WHEN day_no = 1 THEN category END) AS from_category, MAX(CASE WHEN day_no = 2 THEN category END) AS to_category FROM numbered GROUP BY customer) SELECT from_category, to_category, COUNT(*) AS customers, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY from_category), 1) AS pct_of_from FROM pairs WHERE to_category IS NOT NULL GROUP BY from_category, to_category ORDER BY from_category, customers DESC, to_category;
```
