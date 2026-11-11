---
id: da-day-130
title: Reach and depth of referral trees
order: 130
difficulty: advanced
topic: Recursive CTEs
summary: Carry the root of each tree through the recursion to summarise every tree at once.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Carry a group key through a recursive CTE
  - Summarise several trees in one query
prerequisites:
  - Day 97
  - Day 128
---

## Task

Members can refer new members (in the starter query). For every member who was **not referred by anyone** (the root of a referral tree), return `root`, `referrals` (everyone below them, directly or indirectly) and `depth` (the length of the longest chain below them, 0 if they referred nobody). Sort by `referrals` from most to fewest, then `root`.

## Starter query

```sql
WITH RECURSIVE members(id, name, referred_by) AS (
  VALUES
    (1, 'Ana', NULL), (2, 'Bo', 1), (3, 'Cy', 1), (4, 'Di', 2), (5, 'Ed', 4),
    (6, 'Fi', NULL), (7, 'Gu', 6),
    (8, 'Hal', NULL)
)
SELECT id, name, referred_by
FROM members;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Start the recursion with every root, remembering who the root is: `SELECT id, name, id AS root_id, 0 AS depth FROM members WHERE referred_by IS NULL`.
3. The step adds members referred by someone already found, keeping the same `root_id` and `depth + 1`. Then group by the root: `COUNT(*) - 1` (the root itself is in the tree) and `MAX(depth)`.

## Solution

```sql
WITH RECURSIVE members(id, name, referred_by) AS (
  VALUES
    (1, 'Ana', NULL), (2, 'Bo', 1), (3, 'Cy', 1), (4, 'Di', 2), (5, 'Ed', 4),
    (6, 'Fi', NULL), (7, 'Gu', 6),
    (8, 'Hal', NULL)
),
tree(id, root_id, depth) AS (
  SELECT id, id, 0 FROM members WHERE referred_by IS NULL
  UNION ALL
  SELECT m.id, t.root_id, t.depth + 1
  FROM members AS m
  JOIN tree AS t ON m.referred_by = t.id
)
SELECT r.name AS root, COUNT(*) - 1 AS referrals, MAX(t.depth) AS depth
FROM tree AS t
JOIN members AS r ON r.id = t.root_id
GROUP BY t.root_id, r.name
ORDER BY referrals DESC, root;
```

## Expected result

| root | referrals | depth |
| --- | --- | --- |
| Ana | 4 | 3 |
| Fi | 1 | 1 |
| Hal | 0 | 0 |

## Explanation

Carrying the **root id** unchanged through every step labels each member with the tree they belong to, so one recursive query summarises all trees at once. The depth increases by one per step.

Ana's tree holds Bo, Cy, Di and Ed, and the longest chain is Ana → Bo → Di → Ed, three levels. Hal referred nobody: his tree contains only himself, so he has 0 referrals and depth 0, and he still appears because the recursion starts from every root.

**Common mistake:** counting with `COUNT(*)` without subtracting the root, which credits every member with one referral too many.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE members(id, name, referred_by) AS ( VALUES (1, 'Ana', NULL), (2, 'Bo', 1), (3, 'Cy', 1), (4, 'Di', 2), (5, 'Ed', 4), (6, 'Fi', NULL), (7, 'Gu', 6), (8, 'Hal', NULL) ), tree(id, root_id, depth) AS (SELECT id, id, 0 FROM members WHERE referred_by IS NULL UNION ALL SELECT m.id, t.root_id, t.depth + 1 FROM members AS m JOIN tree AS t ON m.referred_by = t.id) SELECT r.name AS root, COUNT(*) AS referrals, MAX(t.depth) AS depth FROM tree AS t JOIN members AS r ON r.id = t.root_id GROUP BY t.root_id, r.name ORDER BY referrals DESC, root;
```
