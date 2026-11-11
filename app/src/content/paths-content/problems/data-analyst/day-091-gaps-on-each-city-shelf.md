---
id: da-day-091
title: Books each city has never bought
order: 91
difficulty: advanced
topic: Joins
summary: Pair every city with every book, then keep the pairs no customer from that city has bought.
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
  - Find missing combinations with CROSS JOIN and NOT EXISTS
  - Exclude NULL keys deliberately
prerequisites:
  - Day 31
  - Day 37
---

## Task

Merchandising wants to know which titles to promote in each city. For **every city that has at least one customer**, return the books that **no customer from that city** has bought in a non-cancelled order, as `city` and `title`. Customers without a city are left out. Sort by `city`, then `title`.

A city whose customers have never ordered (or only cancelled) has every book listed.

## Starter query

```sql
SELECT DISTINCT city
FROM customers;
```

## Hints

1. Start from every possible (city, book) pair: the distinct non-NULL cities `CROSS JOIN books`.
2. Build the pairs that did happen in a CTE: `SELECT DISTINCT c.city, oi.book_id` from customers, non-cancelled orders and their lines.
3. Keep a pair with `WHERE NOT EXISTS (SELECT 1 FROM bought AS x WHERE x.city = ci.city AND x.book_id = b.id)`.

## Solution

```sql
WITH cities AS (
  SELECT DISTINCT city FROM customers WHERE city IS NOT NULL
),
bought AS (
  SELECT DISTINCT c.city, oi.book_id
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
  JOIN order_items AS oi ON oi.order_id = o.id
)
SELECT ci.city, b.title
FROM cities AS ci
CROSS JOIN books AS b
WHERE NOT EXISTS (SELECT 1 FROM bought AS x WHERE x.city = ci.city AND x.book_id = b.id)
ORDER BY ci.city, b.title;
```

## Expected result

| city | title |
| --- | --- |
| Chennai | A Quiet Ledger |
| Chennai | Counting Stars |
| Chennai | Paper Lanterns |
| Chennai | Rivers of Glass |
| Chennai | The Last Signal |
| Chennai | The Silent Orchard |
| Mumbai | A Quiet Ledger |
| Mumbai | Paper Lanterns |
| Mumbai | The Last Signal |
| Mumbai | The Silent Orchard |

## Explanation

Bangalore's two customers have bought all six books between them, so Bangalore does not appear. Mumbai is missing four titles, and Chennai, whose only customer has never ordered, is missing all six.

The pattern is **all possible pairs minus the pairs that happened**: a `CROSS JOIN` makes the possibilities and `NOT EXISTS` removes what exists. It is how analysts find gaps such as products a region never buys or stores that never stock an item.

**Common mistake:** forgetting `city IS NOT NULL`. Sofia Rossi has no city, and `x.city = NULL` is never true, so the `NULL` "city" would be listed as missing every book.

## Other accepted answers

```sql
SELECT ci.city, b.title
FROM (SELECT DISTINCT city FROM customers WHERE city IS NOT NULL) AS ci
CROSS JOIN books AS b
LEFT JOIN (
  SELECT DISTINCT c.city, oi.book_id
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
  JOIN order_items AS oi ON oi.order_id = o.id
) AS x ON x.city = ci.city AND x.book_id = b.id
WHERE x.book_id IS NULL
ORDER BY ci.city, b.title;
```

## Wrong answers

Feedback: extra-rows

```sql
WITH cities AS (SELECT DISTINCT city FROM customers), bought AS (SELECT DISTINCT c.city, oi.book_id FROM customers AS c JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled' JOIN order_items AS oi ON oi.order_id = o.id) SELECT ci.city, b.title FROM cities AS ci CROSS JOIN books AS b WHERE NOT EXISTS (SELECT 1 FROM bought AS x WHERE x.city = ci.city AND x.book_id = b.id) ORDER BY ci.city, b.title;
```
