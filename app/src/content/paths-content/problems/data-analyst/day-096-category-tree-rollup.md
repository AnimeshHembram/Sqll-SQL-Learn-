---
id: da-day-096
title: Roll revenue up a category tree
order: 96
difficulty: advanced
topic: Recursive CTEs
summary: Walk a hierarchy with WITH RECURSIVE so each category includes everything beneath it.
module: data-analyst
duration: 15
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Walk a hierarchy with a recursive CTE
  - Aggregate over every descendant
prerequisites:
  - Day 37
  - Data Analyst chapter: Subqueries and CTEs
---

## Task

The catalogue groups genres into a tree (in the starter query): for example *Fantasy* sits under *Speculative*, which sits under *Fiction*, under *Books*. A book's genre is one of the leaves.

Return every category with its non-cancelled `revenue` **including all categories beneath it**, rounded to 2 decimal places, as `name` and `revenue`. Categories with no sales show `0`. Sort by `revenue` from highest to lowest, then `name`.

## Starter query

```sql
WITH RECURSIVE categories(name, parent) AS (
  VALUES
    ('Books', NULL),
    ('Fiction', 'Books'), ('Non-fiction', 'Books'),
    ('Speculative', 'Fiction'), ('Mystery', 'Fiction'),
    ('Fantasy', 'Speculative'), ('Science fiction', 'Speculative'),
    ('Science', 'Non-fiction'), ('Biography', 'Non-fiction')
)
SELECT name, parent
FROM categories;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The query starts with `WITH RECURSIVE`, so you can add a recursive CTE after `categories`.
2. Build `lineage(name, ancestor)`: start with every category paired with itself, then repeatedly add the parent of the current ancestor: `SELECT l.name, c.parent FROM lineage AS l JOIN categories AS c ON c.name = l.ancestor WHERE c.parent IS NOT NULL`.
3. Revenue per genre goes in another CTE. Then for each category, add up the genre revenue of every `name` whose `ancestor` is that category: `categories LEFT JOIN lineage ON l.ancestor = c.name LEFT JOIN genre_revenue ON g.genre = l.name`.

## Solution

```sql
WITH RECURSIVE categories(name, parent) AS (
  VALUES
    ('Books', NULL),
    ('Fiction', 'Books'), ('Non-fiction', 'Books'),
    ('Speculative', 'Fiction'), ('Mystery', 'Fiction'),
    ('Fantasy', 'Speculative'), ('Science fiction', 'Speculative'),
    ('Science', 'Non-fiction'), ('Biography', 'Non-fiction')
),
lineage(name, ancestor) AS (
  SELECT name, name FROM categories
  UNION ALL
  SELECT l.name, c.parent
  FROM lineage AS l
  JOIN categories AS c ON c.name = l.ancestor
  WHERE c.parent IS NOT NULL
),
genre_revenue AS (
  SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled'
  JOIN books AS b ON b.id = oi.book_id
  GROUP BY b.genre
)
SELECT c.name, ROUND(COALESCE(SUM(g.revenue), 0), 2) AS revenue
FROM categories AS c
LEFT JOIN lineage AS l ON l.ancestor = c.name
LEFT JOIN genre_revenue AS g ON g.genre = l.name
GROUP BY c.name
ORDER BY revenue DESC, c.name;
```

## Expected result

| name | revenue |
| --- | --- |
| Books | 133.46 |
| Fiction | 103.49 |
| Speculative | 75.75 |
| Fantasy | 57.75 |
| Non-fiction | 29.97 |
| Science | 29.97 |
| Mystery | 27.74 |
| Science fiction | 18 |
| Biography | 0 |

## Explanation

A recursive CTE has two parts joined by `UNION ALL`: a starting set (each category with itself) and a step that runs again on its own output (add the parent of the last ancestor) until the step returns no rows, at the root.

The result, `lineage`, lists every (category, ancestor) pair, so *Fantasy* is linked to *Fantasy*, *Speculative*, *Fiction* and *Books*. Summing genre revenue by ancestor then gives each category its whole subtree: *Books* equals total net revenue, 133.46, and *Biography* has no books at all.

**Common mistake:** joining revenue to categories by name only. Leaf genres get the right number, but every parent category shows 0 because no book has the genre *Fiction*.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE categories(name, parent) AS ( VALUES ('Books', NULL), ('Fiction', 'Books'), ('Non-fiction', 'Books'), ('Speculative', 'Fiction'), ('Mystery', 'Fiction'), ('Fantasy', 'Speculative'), ('Science fiction', 'Speculative'), ('Science', 'Non-fiction'), ('Biography', 'Non-fiction') ), genre_revenue AS (SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled' JOIN books AS b ON b.id = oi.book_id GROUP BY b.genre) SELECT c.name, ROUND(COALESCE(SUM(g.revenue), 0), 2) AS revenue FROM categories AS c LEFT JOIN genre_revenue AS g ON g.genre = c.name GROUP BY c.name ORDER BY revenue DESC, c.name;
```
