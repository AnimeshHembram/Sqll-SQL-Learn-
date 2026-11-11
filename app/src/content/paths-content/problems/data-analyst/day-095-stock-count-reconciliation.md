---
id: da-day-095
title: Reconcile a stock count with the system
order: 95
difficulty: advanced
topic: Joins
summary: Use a FULL OUTER JOIN to see rows missing from either side.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare two lists with FULL OUTER JOIN
  - Label one-sided rows
prerequisites:
  - Day 32
  - Day 71
---

## Task

The warehouse counted its shelves; the system has its own numbers. Both lists are in the starter query. Return one row for every book whose numbers **differ**, or that appears in **only one** list: `book_id`, `system_qty`, `counted_qty` (either may be `NULL`) and `status`, which is:

- `'not counted'` when the book is only in the system,
- `'not in system'` when it was counted but the system does not know it,
- `'count differs'` when both have it with different quantities.

Books with matching numbers are left out. Sort by `book_id`.

## Starter query

```sql
WITH system_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 6), (3, 0), (4, 2), (5, 3)
),
counted_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 5), (4, 2), (6, 1), (7, 2)
)
SELECT s.book_id, s.qty AS system_qty, c.qty AS counted_qty
FROM system_stock AS s
LEFT JOIN counted_stock AS c ON c.book_id = s.book_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. A `LEFT JOIN` keeps every system row, but books only on the count sheet disappear.
2. `FULL OUTER JOIN` keeps unmatched rows from both sides. The key is then `COALESCE(s.book_id, c.book_id)`.
3. Decide the status with `CASE WHEN c.book_id IS NULL THEN 'not counted' WHEN s.book_id IS NULL THEN 'not in system' ELSE 'count differs' END`, and filter with `WHERE s.book_id IS NULL OR c.book_id IS NULL OR s.qty <> c.qty`.

## Solution

```sql
WITH system_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 6), (3, 0), (4, 2), (5, 3)
),
counted_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 5), (4, 2), (6, 1), (7, 2)
)
SELECT COALESCE(s.book_id, c.book_id) AS book_id,
  s.qty AS system_qty,
  c.qty AS counted_qty,
  CASE
    WHEN c.book_id IS NULL THEN 'not counted'
    WHEN s.book_id IS NULL THEN 'not in system'
    ELSE 'count differs'
  END AS status
FROM system_stock AS s
FULL OUTER JOIN counted_stock AS c ON c.book_id = s.book_id
WHERE s.book_id IS NULL OR c.book_id IS NULL OR s.qty <> c.qty
ORDER BY book_id;
```

## Expected result

| book_id | system_qty | counted_qty | status |
| --- | --- | --- | --- |
| 2 | 6 | 5 | count differs |
| 3 | 0 | NULL | not counted |
| 5 | 3 | NULL | not counted |
| 6 | NULL | 1 | not in system |
| 7 | NULL | 2 | not in system |

## Explanation

A reconciliation must show differences from **both** sides. `FULL OUTER JOIN` keeps system rows without a count and count rows without a system record, filling the missing side with `NULL`.

Book 3 shows 0 in the system and was not counted: the system is probably right, but it is still flagged so someone confirms it. Book 7 was counted but does not exist in the system, which usually means a mislabelled shelf or a missing product record.

**Common mistake:** filtering with only `WHERE s.qty <> c.qty`. When one side is `NULL` the comparison is not true, so every one-sided row silently disappears and the reconciliation looks cleaner than it is.

## Other accepted answers

```sql
WITH system_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 6), (3, 0), (4, 2), (5, 3)
),
counted_stock(book_id, qty) AS (
  VALUES (1, 4), (2, 5), (4, 2), (6, 1), (7, 2)
)
SELECT s.book_id, s.qty AS system_qty, c.qty AS counted_qty,
  CASE WHEN c.book_id IS NULL THEN 'not counted' ELSE 'count differs' END AS status
FROM system_stock AS s
LEFT JOIN counted_stock AS c ON c.book_id = s.book_id
WHERE c.book_id IS NULL OR s.qty <> c.qty
UNION ALL
SELECT c.book_id, NULL, c.qty, 'not in system'
FROM counted_stock AS c
WHERE NOT EXISTS (SELECT 1 FROM system_stock AS s WHERE s.book_id = c.book_id)
ORDER BY book_id;
```

## Wrong answers

Feedback: missing-rows

```sql
WITH system_stock(book_id, qty) AS ( VALUES (1, 4), (2, 6), (3, 0), (4, 2), (5, 3) ), counted_stock(book_id, qty) AS ( VALUES (1, 4), (2, 5), (4, 2), (6, 1), (7, 2) ) SELECT COALESCE(s.book_id, c.book_id) AS book_id, s.qty AS system_qty, c.qty AS counted_qty, CASE WHEN c.book_id IS NULL THEN 'not counted' WHEN s.book_id IS NULL THEN 'not in system' ELSE 'count differs' END AS status FROM system_stock AS s FULL OUTER JOIN counted_stock AS c ON c.book_id = s.book_id WHERE s.qty <> c.qty ORDER BY book_id;
```
