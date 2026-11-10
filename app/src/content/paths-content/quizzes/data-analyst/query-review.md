---
id: query-review
title: Reviewing an analysis query
order: 13
difficulty: advanced
topic: Run order, fan-out, filters and sanity checks
summary: Check that you can find the silent mistakes that make a query's numbers wrong.
duration: 5
---

## In which order does SQLite process these clauses?

Type: multiple-choice
Topic: Run order
Difficulty: intermediate

- [ ] `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`
- [x] `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`
- [ ] `FROM`, `GROUP BY`, `WHERE`, `SELECT`, `HAVING`, `ORDER BY`
- [ ] `WHERE`, `FROM`, `SELECT`, `GROUP BY`, `ORDER BY`, `HAVING`

### Explanation

Rows are built (`FROM`), filtered (`WHERE`), grouped (`GROUP BY`), groups are filtered (`HAVING`), output columns are calculated (`SELECT`) and finally sorted (`ORDER BY`). That is why `WHERE` cannot use an aggregate or a window function.

## A query joins `customers`, `orders` and `order_items`, then uses `COUNT(*)` per customer. What does it count?

Type: conceptual
Topic: Join fan-out
Difficulty: intermediate

- [ ] Customers
- [ ] Orders
- [x] Order lines
- [ ] Books in stock

### Explanation

After the join to `order_items`, one row is one order line. `COUNT(*)` counts those rows. Count orders with `COUNT(DISTINCT o.id)`, or leave out the join if the question does not need the lines.

## Why does this query return only customers with a delivered order, when every customer was meant to appear?

Type: find-the-error
Topic: Filter placement
Difficulty: advanced

```sql
SELECT c.name, COUNT(o.id) AS delivered_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered'
GROUP BY c.id, c.name;
```

- [ ] `COUNT(o.id)` should be `COUNT(*)`
- [x] The `WHERE` condition removes the rows the `LEFT JOIN` kept; it belongs in the `ON` clause
- [ ] `LEFT JOIN` should be `RIGHT JOIN`
- [ ] `GROUP BY` needs `o.status`

### Explanation

`WHERE` runs after the join, and `NULL = 'delivered'` is not true, so customers without a delivered order disappear. With the condition in `ON`, non-delivered orders simply do not match and every customer keeps a row.

## What does this query return?

Type: predict-output
Topic: NOT IN and NULL
Difficulty: advanced

```sql
SELECT COUNT(*) AS customers FROM customers WHERE city NOT IN ('Mumbai', NULL);
```

- [ ] 4
- [ ] 3
- [x] 0
- [ ] 5

### Explanation

`city NOT IN ('Mumbai', NULL)` means `city <> 'Mumbai' AND city <> NULL`. A comparison with `NULL` is never true, so no row passes. Keep `NULL` out of `NOT IN` lists, or use `NOT EXISTS`.

## Revenue by month adds up to 133.46, but total net revenue is 146.45. What is the most useful conclusion?

Type: conceptual
Topic: Sanity checks
Difficulty: intermediate

- [ ] SQLite added the numbers incorrectly
- [x] The two queries use different definitions or rows, for example one includes cancelled orders; find out which before reporting
- [ ] The larger number is always correct
- [ ] Monthly numbers never add up to totals

### Explanation

A sanity check that disagrees is a signal, not a nuisance. Here the difference is exactly the cancelled order, so the "total" query is gross revenue. Make both queries use the same definition.
