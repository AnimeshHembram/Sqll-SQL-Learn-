---
id: da-day-018
title: Revenue by author country
order: 18
difficulty: intermediate
topic: Joins
summary: Follow a chain of keys from order lines to authors to report revenue by the author's country.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - order_items
  - books
  - authors
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Join four tables through a chain of keys
prerequisites:
  - Day 17
---

## Task

The rights team wants to know which countries' authors bring in the most money. Return `country` and `revenue` (`quantity * unit_price`, rounded to 2 decimal places), not counting cancelled orders. Row order does not matter.

## Starter query

```sql
SELECT oi.order_id, oi.quantity * oi.unit_price AS line_value
FROM order_items AS oi;
```

## Hints

1. You need four tables: lines (value), orders (status), books (author name) and authors (country).
2. `books.author` matches `authors.name`.
3. Join all four, filter out cancelled orders, `GROUP BY a.country`.

## Solution

```sql
SELECT a.country, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id
JOIN authors AS a ON a.name = b.author
WHERE o.status <> 'cancelled'
GROUP BY a.country;
```

## Expected result

| country | revenue |
| --- | --- |
| Hungary | 46.5 |
| India | 60.96 |
| Japan | 11.25 |
| Spain | 14.75 |

## Explanation

Each order line is linked through its book to the author and their country. Hungary leads because *Rivers of Glass* sold three copies. Germany is absent: Leo Brandt has no books.
