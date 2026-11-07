---
id: da-day-020
title: Single-book and multi-book orders
order: 20
difficulty: intermediate
topic: CASE
summary: Label each order by its size after aggregating its lines.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Use CASE on an aggregated value
prerequisites:
  - Day 12
  - Data Analyst chapter: Conditional logic with CASE
---

## Task

Fulfilment packs single-book orders differently. For each order, return `order_id`, `units` (total quantity) and `size`: `'Multi-book'` when units are 2 or more, otherwise `'Single book'`. Row order does not matter.

## Starter query

```sql
SELECT order_id, SUM(quantity) AS units
FROM order_items
GROUP BY order_id;
```

## Hints

1. `CASE` can test an aggregate such as `SUM(quantity)`.
2. Add a `CASE WHEN ... THEN ... ELSE ... END AS size` column.
3. `CASE WHEN SUM(quantity) >= 2 THEN 'Multi-book' ELSE 'Single book' END AS size`

## Solution

```sql
SELECT order_id, SUM(quantity) AS units,
  CASE WHEN SUM(quantity) >= 2 THEN 'Multi-book' ELSE 'Single book' END AS size
FROM order_items
GROUP BY order_id;
```

## Expected result

| order_id | units | size |
| --- | --- | --- |
| 1 | 3 | Multi-book |
| 2 | 1 | Single book |
| 3 | 2 | Multi-book |
| 4 | 1 | Single book |
| 5 | 3 | Multi-book |
| 6 | 1 | Single book |

## Explanation

Grouping gives each order's total units; `CASE` then labels the total. Orders 2, 4 and 6 contain a single book.
