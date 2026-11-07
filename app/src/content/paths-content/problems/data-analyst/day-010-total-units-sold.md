---
id: da-day-010
title: How many books have we sold?
order: 10
difficulty: beginner
topic: Aggregates
summary: Add up a column with SUM, leaving out cancelled orders.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Total a column with SUM
  - Filter before aggregating
prerequisites:
  - Day 4
  - Data Analyst chapter: Combining tables with joins
---

## Task

Return one row with one column, `units_sold`: the total `quantity` of books in orders that were **not cancelled**.

## Starter query

```sql
SELECT SUM(quantity) AS units_sold
FROM order_items;
```

## Hints

1. The starter query counts cancelled orders too; the status is in `orders`.
2. Join `order_items` to `orders` on the order id, then filter.
3. `JOIN orders AS o ON o.id = oi.order_id WHERE o.status <> 'cancelled'`

## Solution

```sql
SELECT SUM(oi.quantity) AS units_sold
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
WHERE o.status <> 'cancelled';
```

## Expected result

| units_sold |
| --- |
| 10 |

## Explanation

There are 11 units across all order lines, but order 4 (one copy) was cancelled, so 10 units were actually sold.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT SUM(quantity) AS units_sold FROM order_items;
```
