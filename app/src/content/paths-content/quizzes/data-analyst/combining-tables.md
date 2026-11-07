---
id: combining-tables
title: Combining tables with joins
order: 1
difficulty: beginner
topic: JOIN and LEFT JOIN
summary: Check that you can choose the right join and spot rows that a join adds or drops.
duration: 4
---

## Why is a customer's name stored in `customers` and not in every order row?

Type: conceptual
Topic: Table design
Difficulty: beginner

- [ ] Because SQL does not allow text in the `orders` table
- [x] So the name is stored once and every order refers to it by `customer_id`
- [ ] Because joins are faster than reading one table
- [ ] So that customers without orders are deleted automatically

### Explanation

Storing each fact once avoids repeating it in many rows, and a corrected name is then correct everywhere. Orders refer to the customer by key, and a join brings the name back when you need it.

## Which join lists every customer, including those with no orders?

Type: choose-the-clause
Topic: LEFT JOIN
Difficulty: beginner

```sql
SELECT c.name, o.id
FROM customers AS c
____ orders AS o ON o.customer_id = c.id;
```

- [ ] `JOIN`
- [ ] `INNER JOIN`
- [x] `LEFT JOIN`
- [ ] `WHERE`

### Explanation

`LEFT JOIN` keeps every row of the left table, `customers`, and fills the `orders` columns with `NULL` when there is no match. `JOIN` and `INNER JOIN` are the same thing and drop customers without orders.

## The shop has 6 orders and 9 order lines. What does this query return?

Type: predict-output
Topic: Row multiplication
Difficulty: intermediate

```sql
SELECT COUNT(*)
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

- [ ] 6
- [x] 9
- [ ] 15
- [ ] 54

### Explanation

The join produces one row per order **line**, so `COUNT(*)` counts 9 rows. To count orders, use `COUNT(DISTINCT o.id)`, which returns 6.

## Which query finds books that have never been ordered?

Type: multiple-choice
Topic: Anti-join
Difficulty: intermediate

- [ ] `SELECT b.title FROM books AS b JOIN order_items AS oi ON oi.book_id = b.id;`
- [x] `SELECT b.title FROM books AS b LEFT JOIN order_items AS oi ON oi.book_id = b.id WHERE oi.book_id IS NULL;`
- [ ] `SELECT b.title FROM books AS b LEFT JOIN order_items AS oi ON oi.book_id = b.id WHERE oi.book_id IS NOT NULL;`
- [ ] `SELECT b.title FROM books AS b WHERE b.id IS NULL;`

### Explanation

`LEFT JOIN` keeps every book; a book that was never ordered gets `NULL` in the `order_items` columns, and `WHERE oi.book_id IS NULL` keeps exactly those. The inner join and the `IS NOT NULL` version return books that **were** ordered.

## Why does this query fail?

Type: find-the-error
Topic: Ambiguous columns
Difficulty: beginner

```sql
SELECT id, name
FROM orders
JOIN customers ON orders.customer_id = customers.id;
```

- [ ] `JOIN` needs the word `INNER` in SQLite
- [ ] `name` does not exist in either table
- [x] Both tables have an `id` column, so `id` is ambiguous
- [ ] The `ON` condition must come before `JOIN`

### Explanation

When a column name exists in more than one joined table, SQL cannot guess which you mean. Write `orders.id` or `customers.id`, or use aliases such as `o.id`.
