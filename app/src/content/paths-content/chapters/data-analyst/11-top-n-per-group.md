---
id: top-n-per-group
title: Top N per group
module: data-analyst
order: 11
level: advanced
duration: 40
summary: Pick the best, latest or Nth row in every group, with a clear rule for ties.
objectives:
  - Explain why GROUP BY with MAX cannot return the other columns of the top row
  - Keep the top N rows per group by numbering rows in a CTE and filtering the number
  - Decide how ties are handled, with ROW_NUMBER, RANK and tie-breaking columns
  - Return the latest or the Nth row per group, and an equivalent correlated subquery
---

"The best-selling book in each genre." "Each customer's latest order." "The top three products per region." These are **top N per group** questions, among the most common requests an analyst receives. They look like `GROUP BY` questions, but `GROUP BY` can only return aggregates; it cannot say *which row* had the maximum. The standard solution combines what you learned in the last two chapters: number the rows inside each group with a window function, then keep the numbers you want.

## Why analysts use this

Analysts use top-N-per-group queries to:

- build "best in category" lists for merchandising,
- find each customer's latest (or first) order with all its details,
- remove duplicates by keeping one row per key,
- pick the Nth event per person, such as the second purchase.

Every one of these needs a decision about ties: if two books share first place, should the list show both, or exactly one?

## Syntax

```sql syntax
WITH ranked AS (
  SELECT columns,
    ROW_NUMBER() OVER (PARTITION BY group_column ORDER BY sort_column DESC, tie_breaker) AS rn
  FROM table_name
)
SELECT columns
FROM ranked
WHERE rn <= N;
```

- `PARTITION BY` defines the groups; `ORDER BY` inside `OVER` defines "best" within each group.
- The filter must be in the outer query, because a window function cannot be used in `WHERE`.
- `ROW_NUMBER()` returns exactly N rows per group (fewer if the group is smaller) and breaks ties arbitrarily unless you add a tie-breaker. `RANK()` keeps all tied rows, so a group can return more than N.

## Examples

### Why MAX is not enough

`MAX` finds the highest price per genre but not the book that has it:

```sql
SELECT genre, MAX(price) AS top_price
FROM books
GROUP BY genre
ORDER BY genre;
```

Expected output:

| genre | top_price |
| --- | --- |
| Fantasy | 15.5 |
| Mystery | 14.75 |
| Science | 9.99 |
| Science fiction | 18 |

Adding `title` to that query would not reliably return the matching title in most databases. Number the rows instead.

### The top row per group

The most expensive book in each genre, with its title:

```sql
WITH ranked AS (
  SELECT genre, title, price,
    ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) AS rn
  FROM books
)
SELECT genre, title, price
FROM ranked
WHERE rn = 1
ORDER BY genre;
```

| genre | title | price |
| --- | --- | --- |
| Fantasy | Rivers of Glass | 15.5 |
| Mystery | A Quiet Ledger | 14.75 |
| Science | Counting Stars | 9.99 |
| Science fiction | The Last Signal | 18 |

### The latest row per group, with all its details

Each customer's latest order, including its status. `MAX(order_date)` alone could not return the status:

```sql
WITH ranked AS (
  SELECT c.name, o.id AS order_id, o.order_date, o.status,
    ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.order_date DESC, o.id DESC) AS rn
  FROM orders AS o
  JOIN customers AS c ON c.id = o.customer_id
)
SELECT name, order_id, order_date, status
FROM ranked
WHERE rn = 1
ORDER BY name;
```

| name | order_id | order_date | status |
| --- | --- | --- | --- |
| Aisha Khan | 3 | 2025-02-05 | shipped |
| Daniel Kim | 5 | 2025-03-01 | delivered |
| Rahul Mehta | 6 | 2025-03-09 | shipped |
| Sofia Rossi | 4 | 2025-02-14 | cancelled |

`o.id DESC` is a **tie-breaker**: if a customer placed two orders on the same day, the one with the higher id counts as the latest. Without it, the choice would depend on chance.

### Ties: ROW_NUMBER or RANK

Best-selling book per genre by units in non-cancelled orders. In Mystery, two books sold one copy each:

```sql
WITH book_units AS (
  SELECT b.genre, b.title, SUM(oi.quantity) AS units
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY b.id, b.genre, b.title
),
ranked AS (
  SELECT genre, title, units,
    ROW_NUMBER() OVER (PARTITION BY genre ORDER BY units DESC, title) AS rn,
    RANK() OVER (PARTITION BY genre ORDER BY units DESC) AS rnk
  FROM book_units
)
SELECT genre, title, units, rn, rnk
FROM ranked
ORDER BY genre, rn;
```

| genre | title | units | rn | rnk |
| --- | --- | --- | --- | --- |
| Fantasy | Rivers of Glass | 3 | 1 | 1 |
| Fantasy | Paper Lanterns | 1 | 2 | 2 |
| Mystery | A Quiet Ledger | 1 | 1 | 1 |
| Mystery | The Silent Orchard | 1 | 2 | 1 |
| Science | Counting Stars | 3 | 1 | 1 |
| Science fiction | The Last Signal | 1 | 1 | 1 |

`WHERE rn = 1` would show one mystery book (the first alphabetically, because of the `title` tie-breaker); `WHERE rnk = 1` would show both. Choose deliberately and say which rule the report uses.

### The Nth row: each customer's second order

Numbering also answers "the second", "the third", and so on:

```sql
WITH numbered AS (
  SELECT customer_id, id AS order_id, order_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, id) AS order_number
  FROM orders
  WHERE status <> 'cancelled'
)
SELECT customer_id, order_id, order_date
FROM numbered
WHERE order_number = 2
ORDER BY customer_id;
```

| customer_id | order_id | order_date |
| --- | --- | --- |
| 1 | 3 | 2025-02-05 |
| 2 | 6 | 2025-03-09 |

Customers with only one non-cancelled order have no second row, so they do not appear.

### The same result with a correlated subquery

Before window functions, "top per group" was written with a subquery that finds the group's maximum for each row. It still works and is worth recognising:

```sql
SELECT b.genre, b.title, b.price
FROM books AS b
WHERE b.price = (SELECT MAX(g.price) FROM books AS g WHERE g.genre = b.genre)
ORDER BY b.genre;
```

| genre | title | price |
| --- | --- | --- |
| Fantasy | Rivers of Glass | 15.5 |
| Mystery | A Quiet Ledger | 14.75 |
| Science | Counting Stars | 9.99 |
| Science fiction | The Last Signal | 18 |

It returns all tied rows, like `RANK`. It cannot easily express "top 3" or "the second", which is why the window version is preferred.

## How the query runs

For "each customer's latest order":

1. `FROM` and `JOIN` combine each order with its customer's name.
2. The window splits the rows by `customer_id`, sorts each customer's orders from newest to oldest and numbers them 1, 2, ...
3. The CTE `ranked` keeps every row with its number.
4. The outer query keeps rows numbered 1: one per customer.

## Common mistakes

**Filtering the window in the same query.**

```sql error
SELECT genre, title, ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) AS rn
FROM books
WHERE rn = 1;
```

`WHERE` runs before the window exists, and the alias `rn` is not known yet. Use a CTE.

**Using LIMIT for a per-group question.** `ORDER BY price DESC LIMIT 4` returns the four most expensive books overall, not one per genre:

```sql
SELECT genre, title, price
FROM books
ORDER BY price DESC
LIMIT 4;
```

| genre | title | price |
| --- | --- | --- |
| Science fiction | The Last Signal | 18 |
| Fantasy | Rivers of Glass | 15.5 |
| Mystery | A Quiet Ledger | 14.75 |
| Mystery | The Silent Orchard | 12.99 |

Mystery appears twice and Science not at all: `LIMIT` cuts the whole result, it knows nothing about groups.

**No tie-breaker.** With `ROW_NUMBER() OVER (PARTITION BY genre ORDER BY units DESC)`, tied books are numbered in an unpredictable order, so the "top" book can change between runs. Add a column that makes the order unique.

**Forgetting `PARTITION BY`.** Without it, the numbering runs over all rows, and `rn = 1` returns a single row for the whole table.

## Key takeaways

- `GROUP BY` with `MAX` finds the top value, not the top row.
- Number rows with `ROW_NUMBER() OVER (PARTITION BY group ORDER BY measure DESC)` in a CTE, then filter the number outside.
- `ROW_NUMBER` gives exactly one row per position; `RANK` keeps ties. Add a tie-breaker when you need a stable single winner.
- The same pattern returns the latest, the first or the Nth row per group.
- `LIMIT` works on the whole result, never per group.
