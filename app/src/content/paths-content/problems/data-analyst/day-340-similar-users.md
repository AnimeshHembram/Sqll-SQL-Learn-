---
id: da-day-340
title: Users with similar wishlists
order: 340
difficulty: advanced
topic: Interview practice
summary: Find pairs of users who share at least two wishlist items, and their overlap as a Jaccard similarity.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find pairs with a self-join
  - Measure overlap with Jaccard similarity
prerequisites:
  - Day 138
  - Day 36
---

## Task

For a "people like you" feature, find **pairs of users** (each pair once, first user's id alphabetically lower) who have **at least two items in common** on their wishlists (starter query). Return `user_a`, `user_b`, `shared` (the number of common items), `shared_items` (in alphabetical order, separated by `', '`) and `jaccard`: shared items ÷ items in either list, rounded to 2 decimal places. Sort by `jaccard` from highest, then `user_a`, then `user_b`.

## Starter query

```sql
WITH wishlists(user_id, item) AS (
  VALUES
    ('u1', 'Atlas'), ('u1', 'Beacon'), ('u1', 'Comet'), ('u1', 'Delta'), ('u2', 'Atlas'), ('u2', 'Beacon'), ('u2', 'Ember'),
    ('u3', 'Comet'), ('u3', 'Delta'), ('u3', 'Atlas'), ('u4', 'Ember'), ('u4', 'Fable'), ('u5', 'Beacon'), ('u5', 'Atlas'),
    ('u5', 'Comet')
)
SELECT user_id, item
FROM wishlists
ORDER BY user_id, item;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Self-join on the item with `a.user_id < b.user_id` to get each pair once, and group by the pair: `COUNT(*)` is the number of shared items. Keep pairs with `HAVING COUNT(*) >= 2`.
3. Items in either list = items of a + items of b − shared. Count each user's items in a CTE and join it twice. Sort the shared items before `GROUP_CONCAT` with a sorted subquery.

## Solution

```sql
WITH wishlists(user_id, item) AS (
  VALUES
    ('u1', 'Atlas'), ('u1', 'Beacon'), ('u1', 'Comet'), ('u1', 'Delta'), ('u2', 'Atlas'), ('u2', 'Beacon'), ('u2', 'Ember'),
    ('u3', 'Comet'), ('u3', 'Delta'), ('u3', 'Atlas'), ('u4', 'Ember'), ('u4', 'Fable'), ('u5', 'Beacon'), ('u5', 'Atlas'),
    ('u5', 'Comet')
),
sizes AS (
  SELECT user_id, COUNT(*) AS items FROM wishlists GROUP BY user_id
),
shared AS (
  SELECT user_a, user_b, COUNT(*) AS shared, GROUP_CONCAT(item, ', ') AS shared_items
  FROM (
    SELECT a.user_id AS user_a, b.user_id AS user_b, a.item
    FROM wishlists AS a
    JOIN wishlists AS b ON b.item = a.item AND a.user_id < b.user_id
    ORDER BY a.user_id, b.user_id, a.item
  )
  GROUP BY user_a, user_b
  HAVING COUNT(*) >= 2
)
SELECT s.user_a, s.user_b, s.shared, s.shared_items,
  ROUND(1.0 * s.shared / (sa.items + sb.items - s.shared), 2) AS jaccard
FROM shared AS s
JOIN sizes AS sa ON sa.user_id = s.user_a
JOIN sizes AS sb ON sb.user_id = s.user_b
ORDER BY jaccard DESC, s.user_a, s.user_b;
```

## Expected result

| user_a | user_b | shared | shared_items | jaccard |
| --- | --- | --- | --- | --- |
| u1 | u3 | 3 | Atlas, Comet, Delta | 0.75 |
| u1 | u5 | 3 | Atlas, Beacon, Comet | 0.75 |
| u2 | u5 | 2 | Atlas, Beacon | 0.5 |
| u3 | u5 | 2 | Atlas, Comet | 0.5 |
| u1 | u2 | 2 | Atlas, Beacon | 0.4 |

## Explanation

Pairs of users come from a self-join on the item, with `a.user_id < b.user_id` so each pair appears once and nobody is paired with themselves. Counting rows per pair gives the shared items; `HAVING` keeps pairs with at least two.

Jaccard similarity divides the shared items by all distinct items either user listed, so it rewards overlap relative to size: u1 and u3 share three items, and u3's whole list is within u1's, giving 0.75; u1 and u2 share only two of u1's four and u2's three, so 0.4. u4 shares nothing with anyone and does not appear.

**Common mistake:** `a.user_id <> b.user_id`. Every pair appears twice, once in each order, so the "people like you" list doubles.

## Wrong answers

Feedback: extra-rows

```sql
WITH wishlists(user_id, item) AS ( VALUES ('u1', 'Atlas'), ('u1', 'Beacon'), ('u1', 'Comet'), ('u1', 'Delta'), ('u2', 'Atlas'), ('u2', 'Beacon'), ('u2', 'Ember'), ('u3', 'Comet'), ('u3', 'Delta'), ('u3', 'Atlas'), ('u4', 'Ember'), ('u4', 'Fable'), ('u5', 'Beacon'), ('u5', 'Atlas'), ('u5', 'Comet') ), sizes AS (SELECT user_id, COUNT(*) AS items FROM wishlists GROUP BY user_id), shared AS (SELECT user_a, user_b, COUNT(*) AS shared, GROUP_CONCAT(item, ', ') AS shared_items FROM (SELECT a.user_id AS user_a, b.user_id AS user_b, a.item FROM wishlists AS a JOIN wishlists AS b ON b.item = a.item AND a.user_id <> b.user_id ORDER BY a.user_id, b.user_id, a.item) GROUP BY user_a, user_b HAVING COUNT(*) >= 2) SELECT s.user_a, s.user_b, s.shared, s.shared_items, ROUND(1.0 * s.shared / (sa.items + sb.items - s.shared), 2) AS jaccard FROM shared AS s JOIN sizes AS sa ON sa.user_id = s.user_a JOIN sizes AS sb ON sb.user_id = s.user_b ORDER BY jaccard DESC, s.user_a, s.user_b;
```
