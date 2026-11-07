---
id: da-day-029
title: Monthly active customers
order: 29
difficulty: advanced
topic: Dates
summary: Count distinct customers per month, a core engagement metric.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct customers per period
prerequisites:
  - Day 17
  - Day 21
---

## Task

Return `month` (`YYYY-MM`) and `active_customers`: how many **different** customers placed a non-cancelled order that month. Sort by month.

## Starter query

```sql
SELECT strftime('%Y-%m', order_date) AS month, customer_id
FROM orders;
```

## Hints

1. Exclude cancelled orders, then group by month.
2. A customer who orders twice in a month counts once: `COUNT(DISTINCT customer_id)`.
3. `WHERE status <> 'cancelled' GROUP BY month ORDER BY month`

## Solution

```sql
SELECT strftime('%Y-%m', order_date) AS month, COUNT(DISTINCT customer_id) AS active_customers
FROM orders
WHERE status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

## Expected result

| month | active_customers |
| --- | --- |
| 2025-01 | 2 |
| 2025-02 | 1 |
| 2025-03 | 2 |

## Explanation

Active customers is a distinct count, not an order count. In February only Aisha Khan placed a non-cancelled order.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT strftime('%Y-%m', order_date) AS month, COUNT(DISTINCT customer_id) AS active_customers FROM orders GROUP BY month ORDER BY month;
```
