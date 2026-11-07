---
id: da-day-049
title: Conversion by sign-up year
order: 49
difficulty: advanced
topic: Metrics
summary: Group customers into cohorts and measure how many became buyers.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Build sign-up cohorts
  - Turn a yes/no test into a count
prerequisites:
  - Day 46
  - Day 35
---

## Task

Group customers by the **year they joined**. Return `join_year`, `customers` (how many joined), `buyers` (how many have at least one non-cancelled order) and `conversion_pct` (buyers as a percentage of customers, rounded to 1 decimal place). Sort by `join_year`.

## Starter query

```sql
SELECT strftime('%Y', joined) AS join_year, COUNT(*) AS customers
FROM customers
GROUP BY join_year
ORDER BY join_year;
```

## Hints

1. Decide per customer whether they are a buyer with `EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.status <> 'cancelled')`. In SQLite this is 1 or 0.
2. Sum that value per cohort to count buyers.
3. `SUM(EXISTS (...)) AS buyers` and `ROUND(100.0 * SUM(EXISTS (...)) / COUNT(*), 1) AS conversion_pct`, or compute a `bought` flag in a CTE first.

## Solution

```sql
WITH flagged AS (
  SELECT strftime('%Y', c.joined) AS join_year,
    EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.status <> 'cancelled') AS bought
  FROM customers AS c
)
SELECT join_year, COUNT(*) AS customers, SUM(bought) AS buyers,
  ROUND(100.0 * SUM(bought) / COUNT(*), 1) AS conversion_pct
FROM flagged
GROUP BY join_year
ORDER BY join_year;
```

## Expected result

| join_year | customers | buyers | conversion_pct |
| --- | --- | --- | --- |
| 2024 | 3 | 2 | 66.7 |
| 2025 | 2 | 1 | 50 |

## Explanation

A cohort is a group of customers who share a start date. Two of the three 2024 customers bought (Sofia Rossi only has a cancelled order), and one of the two 2025 customers. Joining `orders` directly would count a customer once per order, so the flag is worked out per customer first.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT strftime('%Y', c.joined) AS join_year, COUNT(*) AS customers, COUNT(o.id) AS buyers, ROUND(100.0 * COUNT(o.id) / COUNT(*), 1) AS conversion_pct FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled' GROUP BY join_year ORDER BY join_year;
```
