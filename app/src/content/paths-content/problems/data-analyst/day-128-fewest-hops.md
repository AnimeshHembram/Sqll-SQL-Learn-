---
id: da-day-128
title: Fewest hops between warehouses
order: 128
difficulty: advanced
topic: Recursive CTEs
summary: Search a network with a recursive CTE, avoid going round in circles, and keep the shortest path.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Search a graph with a recursive CTE
  - Prevent cycles by tracking the path
prerequisites:
  - Day 97
  - Day 126
---

## Task

Trucks can only travel the **one-way** routes in the starter query. Starting from warehouse **A**, find every warehouse that can be reached and the **fewest hops** (routes driven) needed to get there. Return `warehouse` and `hops`, leaving out A itself and warehouses that cannot be reached. Sort by `hops`, then `warehouse`.

The network has a loop (D → E → B → D), so the search must not visit a warehouse twice on the same path.

## Starter query

```sql
WITH RECURSIVE routes(origin, destination) AS (
  VALUES
    ('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E'), ('E', 'B'),
    ('C', 'F'), ('F', 'E'), ('G', 'H')
)
SELECT origin, destination
FROM routes
ORDER BY origin, destination;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Carry the path visited so far as text, for example `',A,B,'`. Start with `SELECT destination, 1, ',A,' || destination || ',' FROM routes WHERE origin = 'A'`.
3. In the step, only follow a route if its destination is not already on the path: `WHERE instr(s.path, ',' || r.destination || ',') = 0`. Finally `GROUP BY warehouse` with `MIN(hops)`.

## Solution

```sql
WITH RECURSIVE routes(origin, destination) AS (
  VALUES
    ('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E'), ('E', 'B'),
    ('C', 'F'), ('F', 'E'), ('G', 'H')
),
search(warehouse, hops, path) AS (
  SELECT destination, 1, ',A,' || destination || ','
  FROM routes
  WHERE origin = 'A'
  UNION ALL
  SELECT r.destination, s.hops + 1, s.path || r.destination || ','
  FROM search AS s
  JOIN routes AS r ON r.origin = s.warehouse
  WHERE instr(s.path, ',' || r.destination || ',') = 0
)
SELECT warehouse, MIN(hops) AS hops
FROM search
GROUP BY warehouse
ORDER BY hops, warehouse;
```

## Expected result

| warehouse | hops |
| --- | --- |
| B | 1 |
| C | 1 |
| D | 2 |
| F | 2 |
| E | 3 |

## Explanation

A recursive search explores every path from A. Without a guard, the loop D → E → B → D would let it run forever; recording the path and refusing to revisit a warehouse makes every path finite. The search still finds several paths to some warehouses (D can be reached through B or C, and E in three hops or more), so `MIN(hops)` keeps the shortest.

G and H are connected to each other but not to A, so they never appear.

**Common mistake:** keeping the longest or the last path found (`MAX(hops)`), or forgetting the guard entirely. The guard is essential: with a cycle and no guard, the query never finishes.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE routes(origin, destination) AS ( VALUES ('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E'), ('E', 'B'), ('C', 'F'), ('F', 'E'), ('G', 'H') ), search(warehouse, hops, path) AS (SELECT destination, 1, ',A,' || destination || ',' FROM routes WHERE origin = 'A' UNION ALL SELECT r.destination, s.hops + 1, s.path || r.destination || ',' FROM search AS s JOIN routes AS r ON r.origin = s.warehouse WHERE instr(s.path, ',' || r.destination || ',') = 0) SELECT warehouse, MAX(hops) AS hops FROM search GROUP BY warehouse ORDER BY hops, warehouse;
```
