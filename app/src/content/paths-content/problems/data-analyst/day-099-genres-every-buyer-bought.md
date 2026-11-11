---
id: da-day-099
title: Genres bought by every customer
order: 99
difficulty: advanced
topic: Subqueries and CTEs
summary: Relational division: compare a per-group count with the size of the whole set.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Answer a "for all" question with counts (relational division)
  - Keep both sides of a comparison on the same population
prerequisites:
  - Day 35
  - Day 46
---

## Task

Marketing wants genres with universal appeal. Consider only **buyers**: customers with at least one non-cancelled order. For each genre bought in a non-cancelled order, return `genre`, `buyers` (how many different buyers bought it) and `bought_by_all`: `'yes'` if every buyer bought it, otherwise `'no'`. Sort by `buyers` from most to fewest, then `genre`.

## Starter query

```sql
SELECT o.customer_id, b.genre
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id;
```

## Hints

1. Make a CTE of distinct (customer, genre) pairs from non-cancelled orders.
2. The number of buyers is `COUNT(DISTINCT customer_id)` over that same CTE, so cancelled-only customers are excluded on both sides of the comparison.
3. Group the pairs by genre, count them, and compare: `CASE WHEN COUNT(*) = (SELECT COUNT(DISTINCT customer_id) FROM purchases) THEN 'yes' ELSE 'no' END`.

## Solution

```sql
WITH purchases AS (
  SELECT DISTINCT o.customer_id, b.genre
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
)
SELECT genre,
  COUNT(*) AS buyers,
  CASE WHEN COUNT(*) = (SELECT COUNT(DISTINCT customer_id) FROM purchases) THEN 'yes' ELSE 'no' END AS bought_by_all
FROM purchases
GROUP BY genre
ORDER BY buyers DESC, genre;
```

## Expected result

| genre | buyers | bought_by_all |
| --- | --- | --- |
| Fantasy | 3 | yes |
| Mystery | 2 | no |
| Science | 2 | no |
| Science fiction | 1 | no |

## Explanation

"Which X relate to **all** Y?" is called relational division. The counting form is the easiest to read: count the Y each X relates to, and compare with the total number of Y. Using distinct pairs matters: a buyer who bought two Fantasy books must count once.

Only Fantasy was bought by all three buyers (Aisha Khan, Rahul Mehta and Daniel Kim).

**Common mistake:** taking the total from the `customers` table (5) or including cancelled orders on one side only. The two counts must describe the same population, or the answer is always `'no'`.

## Other accepted answers

```sql
WITH purchases AS (
  SELECT DISTINCT o.customer_id, b.genre
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
)
SELECT g.genre, COUNT(*) AS buyers,
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM (SELECT DISTINCT customer_id FROM purchases) AS buyer
    WHERE NOT EXISTS (SELECT 1 FROM purchases AS p WHERE p.customer_id = buyer.customer_id AND p.genre = g.genre)
  ) THEN 'yes' ELSE 'no' END AS bought_by_all
FROM purchases AS g
GROUP BY g.genre
ORDER BY buyers DESC, g.genre;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchases AS (SELECT DISTINCT o.customer_id, b.genre FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled') SELECT genre, COUNT(*) AS buyers, CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM customers) THEN 'yes' ELSE 'no' END AS bought_by_all FROM purchases GROUP BY genre ORDER BY buyers DESC, genre;
```
