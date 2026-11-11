---
id: da-day-168
title: Diff a staging load against the target
order: 168
difficulty: advanced
topic: Data engineering
summary: Classify rows as new, removed or changed with a FULL OUTER JOIN and NULL-safe comparisons.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Diff two tables with FULL OUTER JOIN
  - Compare values NULL-safely with IS NOT
prerequisites:
  - Day 124
  - Day 95
---

## Task

Before loading, the data team compares the new extract (`staging`) with the current table (`target`), matched on `id`. Classify each id as `'new'` (only in staging), `'removed'` (only in target) or `'changed'` (in both, with a different `name` or `city`). A missing city (`NULL`) compared with a real city **is** a change; two missing cities are not.

Return only rows that need action: `id`, `change` and `changed_columns` (`'name'`, `'city'` or `'name, city'` for changed rows, `NULL` otherwise). Sort by `id`.

## Starter query

```sql
WITH target(id, name, city) AS (
  VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', NULL), (3, 'Mina', 'Delhi'), (4, 'Tom', 'Goa'), (5, 'Lee', NULL), (8, 'Kai', 'Agra')
),
staging(id, name, city) AS (
  VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', 'Mumbai'), (3, 'Meena', 'Delhi'), (5, 'Lee', NULL), (6, 'Zoe', 'Kochi'), (8, 'Kai Rao', NULL)
)
SELECT 'target' AS source, id, name, city FROM target
UNION ALL
SELECT 'staging', id, name, city FROM staging
ORDER BY id, source;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `FROM target AS t FULL OUTER JOIN staging AS s ON s.id = t.id`; the id is `COALESCE(t.id, s.id)`.
3. Compare with `IS NOT`, which treats two `NULL`s as equal and `NULL` versus a value as different: `t.city IS NOT s.city`. Build `changed_columns` from pieces such as `CASE WHEN t.name IS NOT s.name THEN 'name' END` joined with `', '`.

## Solution

```sql
WITH target(id, name, city) AS (
  VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', NULL), (3, 'Mina', 'Delhi'), (4, 'Tom', 'Goa'), (5, 'Lee', NULL), (8, 'Kai', 'Agra')
),
staging(id, name, city) AS (
  VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', 'Mumbai'), (3, 'Meena', 'Delhi'), (5, 'Lee', NULL), (6, 'Zoe', 'Kochi'), (8, 'Kai Rao', NULL)
),
compared AS (
  SELECT COALESCE(t.id, s.id) AS id,
    t.id IS NULL AS only_staging,
    s.id IS NULL AS only_target,
    t.name IS NOT s.name AS name_changed,
    t.city IS NOT s.city AS city_changed
  FROM target AS t
  FULL OUTER JOIN staging AS s ON s.id = t.id
)
SELECT id,
  CASE WHEN only_staging THEN 'new' WHEN only_target THEN 'removed' ELSE 'changed' END AS change,
  CASE
    WHEN only_staging OR only_target THEN NULL
    WHEN name_changed AND city_changed THEN 'name, city'
    WHEN name_changed THEN 'name'
    ELSE 'city'
  END AS changed_columns
FROM compared
WHERE only_staging OR only_target OR name_changed OR city_changed
ORDER BY id;
```

## Expected result

| id | change | changed_columns |
| --- | --- | --- |
| 2 | changed | city |
| 3 | changed | name |
| 4 | removed | NULL |
| 6 | new | NULL |
| 8 | changed | name, city |

## Explanation

A diff between two snapshots drives incremental loads: insert the new rows, update the changed ones, and investigate removals. A `FULL OUTER JOIN` sees all three cases in one pass.

`NULL` handling is the trap. Ravi had no city and now has Mumbai; with `<>`, `NULL <> 'Mumbai'` is unknown, so the change would be missed. Lee's city is missing in both versions, which is not a change. `IS NOT` gets both right. Kai's row changed in both columns, and Kai lost his city, which `<>` would also miss.

**Common mistake:** `t.city <> s.city`, which misses every change to or from a missing value.

## Wrong answers

Feedback: incorrect-output

```sql
WITH target(id, name, city) AS ( VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', NULL), (3, 'Mina', 'Delhi'), (4, 'Tom', 'Goa'), (5, 'Lee', NULL), (8, 'Kai', 'Agra') ), staging(id, name, city) AS ( VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', 'Mumbai'), (3, 'Meena', 'Delhi'), (5, 'Lee', NULL), (6, 'Zoe', 'Kochi'), (8, 'Kai Rao', NULL) ), compared AS (SELECT COALESCE(t.id, s.id) AS id, t.id IS NULL AS only_staging, s.id IS NULL AS only_target, COALESCE(t.name <> s.name, 0) AS name_changed, COALESCE(t.city <> s.city, 0) AS city_changed FROM target AS t FULL OUTER JOIN staging AS s ON s.id = t.id) SELECT id, CASE WHEN only_staging THEN 'new' WHEN only_target THEN 'removed' ELSE 'changed' END AS change, CASE WHEN only_staging OR only_target THEN NULL WHEN name_changed AND city_changed THEN 'name, city' WHEN name_changed THEN 'name' ELSE 'city' END AS changed_columns FROM compared WHERE only_staging OR only_target OR name_changed OR city_changed ORDER BY id;
```
