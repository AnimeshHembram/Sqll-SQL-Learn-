---
id: da-day-294
title: Flatten a category tree into level columns
order: 294
difficulty: advanced
topic: Data engineering
summary: Turn a parent-child hierarchy into one row per leaf with level 1, level 2 and level 3 columns.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Flatten a hierarchy into columns
  - Identify leaf nodes
prerequisites:
  - Day 96
  - Day 281
---

## Task

BI tools prefer a hierarchy as columns. From the category tree in the starter query (root `'All products'` at the top), produce one row per **leaf** category (a category with no children) with its path below the root: `level_1`, `level_2` and `level_3` (`NULL` where the path is shorter), plus `depth` (1 for a direct child of the root) and `path` (names joined with `' > '`).

Sort by `path`.

## Starter query

```sql
WITH RECURSIVE categories(id, name, parent_id) AS (
  VALUES
    (1, 'All products', NULL), (2, 'Books', 1), (3, 'Music', 1), (4, 'Fiction', 2), (5, 'Non-fiction', 2),
    (6, 'Mystery', 4), (7, 'Science', 5), (8, 'Vinyl', 3), (9, 'Gift cards', 1)
)
SELECT id, name, parent_id
FROM categories
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Walk down from the root's children.
2. Recursive CTE carrying `depth`, `l1`, `l2`, `l3` and `path`: the anchor is the children of the root (depth 1, `l1 = name`); each step adds one level and sets `l2` or `l3` with `CASE` on the new depth.
3. A leaf is a category that is nobody's parent: `NOT EXISTS (SELECT 1 FROM categories AS c WHERE c.parent_id = t.id)`.

## Solution

```sql
WITH RECURSIVE categories(id, name, parent_id) AS (
  VALUES
    (1, 'All products', NULL), (2, 'Books', 1), (3, 'Music', 1), (4, 'Fiction', 2), (5, 'Non-fiction', 2),
    (6, 'Mystery', 4), (7, 'Science', 5), (8, 'Vinyl', 3), (9, 'Gift cards', 1)
),
tree(id, depth, l1, l2, l3, path) AS (
  SELECT c.id, 1, c.name, NULL, NULL, c.name
  FROM categories AS c
  JOIN categories AS root ON root.id = c.parent_id AND root.parent_id IS NULL
  UNION ALL
  SELECT c.id, t.depth + 1, t.l1,
    CASE WHEN t.depth + 1 = 2 THEN c.name ELSE t.l2 END,
    CASE WHEN t.depth + 1 = 3 THEN c.name ELSE t.l3 END,
    t.path || ' > ' || c.name
  FROM tree AS t
  JOIN categories AS c ON c.parent_id = t.id
)
SELECT l1 AS level_1, l2 AS level_2, l3 AS level_3, depth, path
FROM tree AS t
WHERE NOT EXISTS (SELECT 1 FROM categories AS c WHERE c.parent_id = t.id)
ORDER BY path;
```

## Expected result

| level_1 | level_2 | level_3 | depth | path |
| --- | --- | --- | --- | --- |
| Books | Fiction | Mystery | 3 | Books > Fiction > Mystery |
| Books | Non-fiction | Science | 3 | Books > Non-fiction > Science |
| Gift cards | NULL | NULL | 1 | Gift cards |
| Music | Vinyl | NULL | 2 | Music > Vinyl |

## Explanation

BI tools often want a hierarchy as fixed columns (level 1, level 2, level 3) rather than as parent-child pairs. A recursive CTE walks down from the root's children, carrying the names of the levels so far and adding one level per step; `CASE` on the new depth decides which column receives the current name.

Only leaf categories become rows: Mystery, Science, Vinyl and Gift cards, which have no children. Their depths differ (Gift cards sits directly under the root), so the shorter paths have `NULL` in the deeper columns, which is how BI tools expect ragged hierarchies. Books, Fiction and Music appear only as levels of their leaves.

**Common mistake:** returning every node instead of only the leaves. Intermediate categories like Books get rows of their own, and sales joined to this table would be counted at several levels.

## Wrong answers

Feedback: extra-rows

```sql
WITH RECURSIVE categories(id, name, parent_id) AS ( VALUES (1, 'All products', NULL), (2, 'Books', 1), (3, 'Music', 1), (4, 'Fiction', 2), (5, 'Non-fiction', 2), (6, 'Mystery', 4), (7, 'Science', 5), (8, 'Vinyl', 3), (9, 'Gift cards', 1) ), tree(id, depth, l1, l2, l3, path) AS (SELECT c.id, 1, c.name, NULL, NULL, c.name FROM categories AS c JOIN categories AS root ON root.id = c.parent_id AND root.parent_id IS NULL UNION ALL SELECT c.id, t.depth + 1, t.l1, CASE WHEN t.depth + 1 = 2 THEN c.name ELSE t.l2 END, CASE WHEN t.depth + 1 = 3 THEN c.name ELSE t.l3 END, t.path || ' > ' || c.name FROM tree AS t JOIN categories AS c ON c.parent_id = t.id) SELECT l1 AS level_1, l2 AS level_2, l3 AS level_3, depth, path FROM tree ORDER BY path;
```
