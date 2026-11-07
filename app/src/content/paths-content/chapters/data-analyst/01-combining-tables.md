---
id: combining-tables
title: Combining tables with joins
module: data-analyst
order: 1
level: beginner
duration: 30
summary: Answer questions that need more than one table, such as "who bought what?", by joining tables on matching keys.
objectives:
  - Explain why company data is split across several tables
  - Combine two or three tables with INNER JOIN
  - Keep rows that have no match with LEFT JOIN, and use that to find gaps
  - Check that a join has not duplicated or lost rows
---

Almost every real analysis question needs more than one table. "Which customers placed orders?" needs `customers` **and** `orders`. "Which books sell best?" needs `books` **and** `order_items`. A **join** puts matching rows from two tables side by side, so one query can answer the question.

## Why analysts use this

Databases store each kind of thing once, in its own table. A customer's name is stored once in `customers`; each order only stores the customer's `id`. This avoids repeating the same name in hundreds of order rows, and it means a corrected name is correct everywhere.

The price of this tidy design is that the answer to a business question is spread across tables. Joins put it back together. As an analyst you will join tables in most queries you write: orders to customers to find who is buying, order lines to products to find what is selling, and customers to orders to find who has **not** bought anything yet.

In the bookstore database:

| Table | One row per | Links to |
| --- | --- | --- |
| `customers` | customer | |
| `orders` | order | `customers` through `orders.customer_id = customers.id` |
| `order_items` | book in an order | `orders` through `order_id`, `books` through `book_id` |
| `books` | book | `authors` through `books.author = authors.name` |

## Syntax

```sql syntax
SELECT a.column, b.column
FROM table_a AS a
JOIN table_b AS b ON a.key = b.key;

SELECT a.column, b.column
FROM table_a AS a
LEFT JOIN table_b AS b ON a.key = b.key;
```

- `JOIN` (also written `INNER JOIN`) keeps only rows that have a match in **both** tables.
- `LEFT JOIN` keeps **every** row of the first (left) table. Where there is no match, the columns of the second table are `NULL`.
- `ON` says which columns must be equal for two rows to match. It is usually a key: an `id` in one table and the column that refers to it in the other.
- `AS o` gives a table a short alias, so `o.order_date` is quicker to write than `orders.order_date`. When two tables have a column with the same name, such as `id`, the alias tells SQL which one you mean.

## Examples

### Who placed each order?

The `orders` table only stores `customer_id`. To see names, join it to `customers`:

```sql
SELECT o.id AS order_id, o.order_date, c.name AS customer
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
ORDER BY o.id;
```

Expected output:

| order_id | order_date | customer |
| --- | --- | --- |
| 1 | 2025-01-10 | Aisha Khan |
| 2 | 2025-01-18 | Rahul Mehta |
| 3 | 2025-02-05 | Aisha Khan |
| 4 | 2025-02-14 | Sofia Rossi |
| 5 | 2025-03-01 | Daniel Kim |
| 6 | 2025-03-09 | Rahul Mehta |

Each of the 6 orders found exactly one customer, so the result has 6 rows: one per order.

### Join three tables: what was in each order?

`order_items` links orders to books. Joining it to `books` gives each line a title, and multiplying `quantity` by `unit_price` gives the line's value:

```sql
SELECT oi.order_id, b.title, oi.quantity, oi.quantity * oi.unit_price AS line_total
FROM order_items AS oi
JOIN books AS b ON oi.book_id = b.id
ORDER BY oi.order_id, b.title;
```

| order_id | title | quantity | line_total |
| --- | --- | --- | --- |
| 1 | Counting Stars | 2 | 19.98 |
| 1 | The Silent Orchard | 1 | 12.99 |
| 2 | Rivers of Glass | 1 | 15.5 |
| 3 | Paper Lanterns | 1 | 11.25 |
| 3 | The Last Signal | 1 | 18 |
| 4 | The Silent Orchard | 1 | 12.99 |
| 5 | A Quiet Ledger | 1 | 14.75 |
| 5 | Rivers of Glass | 2 | 31 |
| 6 | Counting Stars | 1 | 9.99 |

You can keep adding joins: each `JOIN ... ON ...` adds one more table.

### Revenue by customer

Joins and `GROUP BY` work together. This is a typical analyst query: total spend per customer, leaving out cancelled orders:

```sql
SELECT c.name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.name
ORDER BY revenue DESC;
```

| name | revenue |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |
| Rahul Mehta | 25.49 |

Sofia Rossi's only order was cancelled, and Meera Pillai has not ordered yet, so neither appears.

### Keep rows without a match: LEFT JOIN

To list **every** customer with their number of orders, including customers who have none, use `LEFT JOIN`:

```sql
SELECT c.name, COUNT(o.id) AS orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY orders DESC, c.name;
```

| name | orders |
| --- | --- |
| Aisha Khan | 2 |
| Rahul Mehta | 2 |
| Daniel Kim | 1 |
| Sofia Rossi | 1 |
| Meera Pillai | 0 |

`COUNT(o.id)` counts only matched orders, because `o.id` is `NULL` for Meera Pillai. `COUNT(*)` would count her row and wrongly show 1.

### Find what is missing

A `LEFT JOIN` followed by `WHERE ... IS NULL` keeps only the rows that found **no** match. Which authors have no books in the shop?

```sql
SELECT a.name, a.country
FROM authors AS a
LEFT JOIN books AS b ON b.author = a.name
WHERE b.id IS NULL;
```

| name | country |
| --- | --- |
| Leo Brandt | Germany |

This pattern ("anti-join") answers many analyst questions: customers who never ordered, products never sold, sign-ups who never logged in.

## How the query runs

For the revenue-by-customer query:

1. `FROM customers AS c JOIN orders AS o ON o.customer_id = c.id` pairs each customer with each of their orders. Customers without orders drop out, because this is an inner join.
2. `JOIN order_items AS oi ON oi.order_id = o.id` pairs each of those rows with each book line in the order. An order with two lines now appears twice.
3. `WHERE o.status <> 'cancelled'` removes the lines of cancelled orders.
4. `GROUP BY c.name` makes one group per customer, and `SUM(...)` adds up the line values in each group.
5. `ORDER BY revenue DESC` puts the biggest spender first.

## Common mistakes

**Forgetting that a join can multiply rows.** Joining orders to their lines repeats each order once per line. Counting orders after that join counts **lines**, not orders:

```sql
SELECT COUNT(*) AS orders_counted
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

| orders_counted |
| --- |
| 9 |

There are only 6 orders, but 9 order lines. Count distinct orders instead:

```sql
SELECT COUNT(DISTINCT o.id) AS orders
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

| orders |
| --- |
| 6 |

**An ambiguous column name.** Both `orders` and `customers` have an `id` column, so SQL cannot tell which one you mean:

```sql error
SELECT id, name
FROM orders
JOIN customers ON orders.customer_id = customers.id;
```

Write `orders.id` or use aliases (`o.id`).

**Using an inner join when you need every row.** `JOIN` silently drops customers without orders. If the question is about **all** customers, use `LEFT JOIN`.

**Filtering the right table in WHERE after a LEFT JOIN.** `WHERE o.status = 'delivered'` removes the `NULL` rows that `LEFT JOIN` kept, turning it back into an inner join. Put such conditions in the `ON` clause when you want to keep unmatched rows.

## Key takeaways

- Data is split across tables; joins combine matching rows using keys.
- `JOIN` keeps only matched rows. `LEFT JOIN` keeps every row of the left table, with `NULL` where nothing matched.
- `LEFT JOIN ... WHERE right_table.key IS NULL` finds rows with no match.
- After a join, check the row count: joins can repeat rows. Use `COUNT(DISTINCT ...)` when counting the "one" side of a one-to-many join.
- Use table aliases and always qualify columns that exist in both tables.
