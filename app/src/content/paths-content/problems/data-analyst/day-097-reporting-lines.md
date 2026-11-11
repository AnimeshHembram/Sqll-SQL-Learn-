---
id: da-day-097
title: Reporting lines from the CEO down
order: 97
difficulty: advanced
topic: Recursive CTEs
summary: Build each person's chain of managers and their level with a recursive CTE.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Walk down a hierarchy with a recursive CTE
  - Carry a path and a depth through the recursion
prerequisites:
  - Day 96
---

## Task

The staff list (in the starter query) records each person's `manager_id`; the CEO has none. Return **everyone who reports, directly or indirectly, to the CEO**: `name`, `level` (1 for the CEO, 2 for people reporting to the CEO, and so on) and `chain`, the names from the CEO down to the person joined with `' > '` (for example `'Asha > Vikram > Omar'`). Sort by `chain`.

Kai's manager (id 9) has left and is not in the list, so Kai is not part of the tree.

## Starter query

```sql
WITH RECURSIVE staff(id, name, manager_id) AS (
  VALUES
    (1, 'Asha', NULL),
    (2, 'Vikram', 1), (3, 'Leela', 1),
    (4, 'Omar', 2), (5, 'Nina', 2), (7, 'Priti', 3),
    (6, 'Jon', 4),
    (8, 'Kai', 9)
)
SELECT id, name, manager_id
FROM staff;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The query already starts with `WITH RECURSIVE`.
2. Start the recursion with the CEO: `SELECT id, name, 1, name FROM staff WHERE manager_id IS NULL`.
3. The step adds each person whose manager is already in the tree: `JOIN tree AS t ON s.manager_id = t.id`, with `t.level + 1` and `t.chain || ' > ' || s.name`.

## Solution

```sql
WITH RECURSIVE staff(id, name, manager_id) AS (
  VALUES
    (1, 'Asha', NULL),
    (2, 'Vikram', 1), (3, 'Leela', 1),
    (4, 'Omar', 2), (5, 'Nina', 2), (7, 'Priti', 3),
    (6, 'Jon', 4),
    (8, 'Kai', 9)
),
tree(id, name, level, chain) AS (
  SELECT id, name, 1, name
  FROM staff
  WHERE manager_id IS NULL
  UNION ALL
  SELECT s.id, s.name, t.level + 1, t.chain || ' > ' || s.name
  FROM staff AS s
  JOIN tree AS t ON s.manager_id = t.id
)
SELECT name, level, chain
FROM tree
ORDER BY chain;
```

## Expected result

| name | level | chain |
| --- | --- | --- |
| Asha | 1 | Asha |
| Leela | 2 | Asha > Leela |
| Priti | 3 | Asha > Leela > Priti |
| Vikram | 2 | Asha > Vikram |
| Nina | 3 | Asha > Vikram > Nina |
| Omar | 3 | Asha > Vikram > Omar |
| Jon | 4 | Asha > Vikram > Omar > Jon |

## Explanation

The recursion starts from the root and walks **down**: each step finds the people whose manager was found in the previous step, carrying the level and the chain with it. Sorting by the chain lists the organisation as an outline, each manager followed by their team.

Kai is never reached because no step can connect manager 9 to the CEO. In real data, such orphans are worth reporting separately: they usually mean someone left without their team being reassigned.

**Common mistake:** starting the level at 0, or building the chain the wrong way round (`s.name || ' > ' || t.chain`), which lists the person first and the CEO last.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE staff(id, name, manager_id) AS ( VALUES (1, 'Asha', NULL), (2, 'Vikram', 1), (3, 'Leela', 1), (4, 'Omar', 2), (5, 'Nina', 2), (7, 'Priti', 3), (6, 'Jon', 4), (8, 'Kai', 9) ), tree(id, name, level, chain) AS (SELECT id, name, 0, name FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, s.name, t.level + 1, t.chain || ' > ' || s.name FROM staff AS s JOIN tree AS t ON s.manager_id = t.id) SELECT name, level, chain FROM tree ORDER BY chain;
```
