---
id: da-day-054
title: Average books per order
order: 54
difficulty: intermediate
topic: Metrics
summary: Avoid integer division when dividing two counts.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Avoid integer division
prerequisites:
  - Day 27
  - Day 45
---

## Task

Return one row with `books_per_order`: total quantity across all order lines divided by the number of different orders (any status), rounded to 2 decimal places.

## Starter query

```sql
SELECT SUM(quantity) / COUNT(DISTINCT order_id) AS books_per_order
FROM order_items;
```

## Hints

1. Run the starter query. 11 books in 6 orders cannot be exactly 1.
2. When both sides are whole numbers, SQLite divides as whole numbers and drops the remainder.
3. Make one side a decimal: `ROUND(1.0 * SUM(quantity) / COUNT(DISTINCT order_id), 2)`.

## Solution

```sql
SELECT ROUND(1.0 * SUM(quantity) / COUNT(DISTINCT order_id), 2) AS books_per_order
FROM order_items;
```

## Expected result

| books_per_order |
| --- |
| 1.83 |

## Explanation

`11 / 6` is integer division and gives 1. Multiplying by `1.0` (or using `CAST(... AS REAL)`) makes it 1.83. This silent mistake is one of the most common causes of wrong ratios in reports.

## Other accepted answers

```sql
SELECT ROUND(CAST(SUM(quantity) AS REAL) / COUNT(DISTINCT order_id), 2) AS books_per_order FROM order_items;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT SUM(quantity) / COUNT(DISTINCT order_id) AS books_per_order FROM order_items;
```
