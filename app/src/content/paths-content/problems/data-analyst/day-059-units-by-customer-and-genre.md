---
id: da-day-059
title: Customer-by-genre pivot table
order: 59
difficulty: advanced
topic: Reporting
summary: Turn rows into columns with conditional aggregation.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot rows into columns with SUM(CASE ...)
prerequisites:
  - Day 27
  - Day 37
---

## Task

A spreadsheet-style report needs one row per customer who bought something (non-cancelled orders) and one column per genre. Return `name`, `mystery`, `fantasy`, `science` and `science_fiction`: units bought in each genre, `0` where none. Sort by `name`.

## Starter query

```sql
SELECT c.name, b.genre, SUM(oi.quantity) AS units
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY c.name, b.genre;
```

## Hints

1. The starter query has one row per customer and genre. You want one row per customer, so group by name only.
2. Each column adds up the units for one genre only: `SUM(CASE WHEN b.genre = 'Mystery' THEN oi.quantity ELSE 0 END) AS mystery`.
3. Write four of those columns, one per genre (`'Mystery'`, `'Fantasy'`, `'Science'`, `'Science fiction'`).

## Solution

```sql
SELECT c.name,
  SUM(CASE WHEN b.genre = 'Mystery' THEN oi.quantity ELSE 0 END) AS mystery,
  SUM(CASE WHEN b.genre = 'Fantasy' THEN oi.quantity ELSE 0 END) AS fantasy,
  SUM(CASE WHEN b.genre = 'Science' THEN oi.quantity ELSE 0 END) AS science,
  SUM(CASE WHEN b.genre = 'Science fiction' THEN oi.quantity ELSE 0 END) AS science_fiction
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY c.name
ORDER BY c.name;
```

## Expected result

| name | mystery | fantasy | science | science_fiction |
| --- | --- | --- | --- | --- |
| Aisha Khan | 1 | 1 | 2 | 1 |
| Daniel Kim | 1 | 2 | 0 | 0 |
| Rahul Mehta | 0 | 1 | 1 | 0 |

## Explanation

Conditional aggregation is SQL's pivot: each `SUM(CASE ...)` collects one category into its own column. `ELSE 0` makes empty cells 0 instead of `NULL`. The column list is fixed, so a new genre needs a new column.
