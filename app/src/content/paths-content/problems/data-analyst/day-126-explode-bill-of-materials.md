---
id: da-day-126
title: Explode a bill of materials
order: 126
difficulty: advanced
topic: Recursive CTEs
summary: Multiply quantities down a recursive hierarchy, then add up the leaf parts.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Multiply quantities through a recursive hierarchy
  - Aggregate parts reached by several routes
prerequisites:
  - Day 96
  - Day 97
---

## Task

A workshop is building **10 bikes**. The bill of materials (in the starter query) says what each assembly contains and how many: a bike has 2 wheels, a wheel has 32 spokes and 1 hub, a hub has 2 bearings, and so on. Some parts, like cables, appear in more than one place.

Return every **basic part** (a part that is not itself made of other parts) with the total quantity needed for 10 bikes, as `part` and `total_qty`. Sort by `part`.

## Starter query

```sql
WITH RECURSIVE bom(parent, child, qty) AS (
  VALUES
    ('Bike', 'Frame', 1), ('Bike', 'Wheel', 2), ('Bike', 'Brake kit', 2), ('Bike', 'Cable', 1),
    ('Wheel', 'Rim', 1), ('Wheel', 'Spoke', 32), ('Wheel', 'Hub', 1),
    ('Hub', 'Bearing', 2),
    ('Brake kit', 'Pad', 2), ('Brake kit', 'Cable', 1), ('Brake kit', 'Lever', 1)
)
SELECT parent, child, qty
FROM bom;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The query already starts with `WITH RECURSIVE`.
2. Start with the bike's direct children and their quantity for 10 bikes: `SELECT child, qty * 10 FROM bom WHERE parent = 'Bike'`. The step joins each part found to its own children and multiplies: `x.qty * b.qty`.
3. A basic part never appears as a `parent`: `WHERE part NOT IN (SELECT parent FROM bom)`. Then `GROUP BY part` and `SUM` the quantities, because a part can be reached by several routes.

## Solution

```sql
WITH RECURSIVE bom(parent, child, qty) AS (
  VALUES
    ('Bike', 'Frame', 1), ('Bike', 'Wheel', 2), ('Bike', 'Brake kit', 2), ('Bike', 'Cable', 1),
    ('Wheel', 'Rim', 1), ('Wheel', 'Spoke', 32), ('Wheel', 'Hub', 1),
    ('Hub', 'Bearing', 2),
    ('Brake kit', 'Pad', 2), ('Brake kit', 'Cable', 1), ('Brake kit', 'Lever', 1)
),
exploded(part, qty) AS (
  SELECT child, qty * 10 FROM bom WHERE parent = 'Bike'
  UNION ALL
  SELECT b.child, x.qty * b.qty
  FROM exploded AS x
  JOIN bom AS b ON b.parent = x.part
)
SELECT part, SUM(qty) AS total_qty
FROM exploded
WHERE part NOT IN (SELECT parent FROM bom)
GROUP BY part
ORDER BY part;
```

## Expected result

| part | total_qty |
| --- | --- |
| Bearing | 40 |
| Cable | 30 |
| Frame | 10 |
| Lever | 20 |
| Pad | 40 |
| Rim | 20 |
| Spoke | 640 |

## Explanation

Each recursive step carries the **multiplied** quantity down a level: 10 bikes need 20 wheels, 20 wheels need 640 spokes and 20 hubs, and 20 hubs need 40 bearings. Hubs, wheels and brake kits are assemblies, so they are not in the result.

Cables are needed directly on each bike (10) and inside each of the 20 brake kits (20), so the total is 30. That is why the final step groups and adds: the recursion produces one row per **route** to a part.

**Common mistake:** carrying the child's own quantity instead of multiplying (`b.qty` rather than `x.qty * b.qty`), which gives 32 spokes in total instead of 640.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE bom(parent, child, qty) AS ( VALUES ('Bike', 'Frame', 1), ('Bike', 'Wheel', 2), ('Bike', 'Brake kit', 2), ('Bike', 'Cable', 1), ('Wheel', 'Rim', 1), ('Wheel', 'Spoke', 32), ('Wheel', 'Hub', 1), ('Hub', 'Bearing', 2), ('Brake kit', 'Pad', 2), ('Brake kit', 'Cable', 1), ('Brake kit', 'Lever', 1) ), exploded(part, qty) AS (SELECT child, qty * 10 FROM bom WHERE parent = 'Bike' UNION ALL SELECT b.child, b.qty FROM exploded AS x JOIN bom AS b ON b.parent = x.part) SELECT part, SUM(qty) AS total_qty FROM exploded WHERE part NOT IN (SELECT parent FROM bom) GROUP BY part ORDER BY part;
```
