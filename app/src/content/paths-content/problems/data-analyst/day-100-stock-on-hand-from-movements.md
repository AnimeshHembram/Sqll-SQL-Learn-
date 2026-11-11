---
id: da-day-100
title: Stock on hand from stock movements
order: 100
difficulty: advanced
topic: Subqueries and CTEs
summary: Turn a movement log into balances with signed quantities, then compare with reorder levels.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate balances from an event log
  - Combine several CTEs into a report
prerequisites:
  - Day 93
  - Day 20
---

## Task

Day 100. The warehouse does not store stock levels; it logs every **movement** (in the starter query): `received` and `returned` add stock, `sold` and `written_off` remove it. Some books have a reorder level.

For **every book in the catalogue**, return `title`, `on_hand` (0 if it never moved), `reorder_at` (`NULL` if it has none) and `needs_reorder`: `'yes'` when it has a reorder level and `on_hand` is **at or below** it, otherwise `'no'`. Sort by `title`.

## Starter query

```sql
WITH stock_moves(book_id, moved_on, kind, qty) AS (
  VALUES
    (1, '2025-03-01', 'received', 10), (1, '2025-03-05', 'sold', 4), (1, '2025-03-09', 'returned', 1),
    (2, '2025-03-01', 'received', 6), (2, '2025-03-07', 'sold', 5),
    (3, '2025-03-02', 'received', 8), (3, '2025-03-08', 'written_off', 2), (3, '2025-03-10', 'sold', 3),
    (4, '2025-03-03', 'received', 3), (4, '2025-03-11', 'sold', 3),
    (6, '2025-03-04', 'received', 5)
),
reorder_levels(book_id, reorder_at) AS (
  VALUES (1, 3), (2, 2), (3, 3), (4, 1), (5, 2)
)
SELECT book_id, kind, qty
FROM stock_moves;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Give each movement a sign: `CASE WHEN kind IN ('received', 'returned') THEN qty ELSE -qty END`, and add them up per book in a CTE.
3. Start from `books` and `LEFT JOIN` both the balances and `reorder_levels`, using `COALESCE(on_hand, 0)`. A `NULL` reorder level must give `'no'`: `CASE WHEN r.reorder_at IS NOT NULL AND COALESCE(s.on_hand, 0) <= r.reorder_at THEN 'yes' ELSE 'no' END`.

## Solution

```sql
WITH stock_moves(book_id, moved_on, kind, qty) AS (
  VALUES
    (1, '2025-03-01', 'received', 10), (1, '2025-03-05', 'sold', 4), (1, '2025-03-09', 'returned', 1),
    (2, '2025-03-01', 'received', 6), (2, '2025-03-07', 'sold', 5),
    (3, '2025-03-02', 'received', 8), (3, '2025-03-08', 'written_off', 2), (3, '2025-03-10', 'sold', 3),
    (4, '2025-03-03', 'received', 3), (4, '2025-03-11', 'sold', 3),
    (6, '2025-03-04', 'received', 5)
),
reorder_levels(book_id, reorder_at) AS (
  VALUES (1, 3), (2, 2), (3, 3), (4, 1), (5, 2)
),
balances AS (
  SELECT book_id,
    SUM(CASE WHEN kind IN ('received', 'returned') THEN qty ELSE -qty END) AS on_hand
  FROM stock_moves
  GROUP BY book_id
)
SELECT b.title,
  COALESCE(s.on_hand, 0) AS on_hand,
  r.reorder_at,
  CASE WHEN r.reorder_at IS NOT NULL AND COALESCE(s.on_hand, 0) <= r.reorder_at THEN 'yes' ELSE 'no' END AS needs_reorder
FROM books AS b
LEFT JOIN balances AS s ON s.book_id = b.id
LEFT JOIN reorder_levels AS r ON r.book_id = b.id
ORDER BY b.title;
```

## Expected result

| title | on_hand | reorder_at | needs_reorder |
| --- | --- | --- | --- |
| A Quiet Ledger | 5 | NULL | no |
| Counting Stars | 3 | 3 | yes |
| Paper Lanterns | 0 | 2 | yes |
| Rivers of Glass | 1 | 2 | yes |
| The Last Signal | 0 | 1 | yes |
| The Silent Orchard | 7 | 3 | no |

## Explanation

Logs of events (movements, payments, logins) are common, and balances are calculated from them by giving each event a sign and adding them up. Keeping that step in its own CTE makes it easy to check before the reorder logic is added.

*Counting Stars* has 3 left and a reorder level of 3: "at or below" includes the boundary, so it is flagged. *Paper Lanterns* never moved, so it has 0 and is flagged too. *A Quiet Ledger* has no reorder level, so it is never flagged however low it runs, which may itself be worth reporting.

**Common mistakes:** adding all quantities as positive numbers; and starting from the movements instead of `books`, which loses *Paper Lanterns* entirely.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stock_moves(book_id, moved_on, kind, qty) AS ( VALUES (1, '2025-03-01', 'received', 10), (1, '2025-03-05', 'sold', 4), (1, '2025-03-09', 'returned', 1), (2, '2025-03-01', 'received', 6), (2, '2025-03-07', 'sold', 5), (3, '2025-03-02', 'received', 8), (3, '2025-03-08', 'written_off', 2), (3, '2025-03-10', 'sold', 3), (4, '2025-03-03', 'received', 3), (4, '2025-03-11', 'sold', 3), (6, '2025-03-04', 'received', 5) ), reorder_levels(book_id, reorder_at) AS ( VALUES (1, 3), (2, 2), (3, 3), (4, 1), (5, 2) ), balances AS (SELECT book_id, SUM(qty) AS on_hand FROM stock_moves GROUP BY book_id) SELECT b.title, COALESCE(s.on_hand, 0) AS on_hand, r.reorder_at, CASE WHEN r.reorder_at IS NOT NULL AND COALESCE(s.on_hand, 0) <= r.reorder_at THEN 'yes' ELSE 'no' END AS needs_reorder FROM books AS b LEFT JOIN balances AS s ON s.book_id = b.id LEFT JOIN reorder_levels AS r ON r.book_id = b.id ORDER BY b.title;
```

Feedback: missing-rows

```sql
WITH stock_moves(book_id, moved_on, kind, qty) AS ( VALUES (1, '2025-03-01', 'received', 10), (1, '2025-03-05', 'sold', 4), (1, '2025-03-09', 'returned', 1), (2, '2025-03-01', 'received', 6), (2, '2025-03-07', 'sold', 5), (3, '2025-03-02', 'received', 8), (3, '2025-03-08', 'written_off', 2), (3, '2025-03-10', 'sold', 3), (4, '2025-03-03', 'received', 3), (4, '2025-03-11', 'sold', 3), (6, '2025-03-04', 'received', 5) ), reorder_levels(book_id, reorder_at) AS ( VALUES (1, 3), (2, 2), (3, 3), (4, 1), (5, 2) ), balances AS (SELECT book_id, SUM(CASE WHEN kind IN ('received', 'returned') THEN qty ELSE -qty END) AS on_hand FROM stock_moves GROUP BY book_id) SELECT b.title, s.on_hand, r.reorder_at, CASE WHEN r.reorder_at IS NOT NULL AND s.on_hand <= r.reorder_at THEN 'yes' ELSE 'no' END AS needs_reorder FROM balances AS s JOIN books AS b ON b.id = s.book_id LEFT JOIN reorder_levels AS r ON r.book_id = b.id ORDER BY b.title;
```
