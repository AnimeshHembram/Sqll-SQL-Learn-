---
id: da-day-011
title: Average order line value
order: 11
difficulty: intermediate
topic: Aggregates
summary: Average a calculated value across all order lines.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Aggregate a calculated expression
prerequisites:
  - Day 7
  - Day 10
---

## Task

Finance tracks the average value of an order line (`quantity * unit_price`). Return one row with `avg_line_value`, rounded to 2 decimal places, across **all** order lines.

## Starter query

```sql
SELECT quantity * unit_price AS line_value
FROM order_items;
```

## Hints

1. The starter query shows each line's value. Now you need their average.
2. Put the calculation inside `AVG(...)`.
3. `ROUND(AVG(quantity * unit_price), 2) AS avg_line_value`

## Solution

```sql
SELECT ROUND(AVG(quantity * unit_price), 2) AS avg_line_value
FROM order_items;
```

## Expected result

| avg_line_value |
| --- |
| 16.27 |

## Explanation

`AVG` works on any expression, so SQL calculates each line's value and averages the 9 results.
