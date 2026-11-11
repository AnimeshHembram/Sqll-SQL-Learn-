---
id: da-day-203
title: Load parcels onto trucks in order
order: 203
difficulty: advanced
topic: Recursive CTEs
summary: A running total that resets when a capacity would be exceeded needs a recursive CTE.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Reset a running total with a recursive CTE
  - Apply a greedy capacity rule
prerequisites:
  - Day 187
  - Day 125
---

## Task

Parcels (in the starter query) are loaded in `seq` order onto trucks that carry at most **100 kg**. A parcel goes on the current truck if it still fits; otherwise a new truck starts with that parcel. Return one row per truck: `truck` (1, 2, …), `parcels` (names in loading order, joined with `','`), `load_kg` and `spare_kg`. Sort by `truck`.

## Starter query

```sql
WITH RECURSIVE parcels(seq, parcel, kg) AS (
  VALUES (1, 'P1', 40), (2, 'P2', 35), (3, 'P3', 30), (4, 'P4', 20), (5, 'P5', 50), (6, 'P6', 50), (7, 'P7', 100), (8, 'P8', 10)
)
SELECT seq, parcel, kg, SUM(kg) OVER (ORDER BY seq) AS running_kg
FROM parcels
ORDER BY seq;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`. The starter's running total shows why a plain window is not enough: it never resets.
2. Walk through the parcels one at a time, carrying `truck` and `load`: start with `SELECT seq, parcel, kg, 1, kg FROM parcels WHERE seq = 1`.
3. In the step, join the next parcel: if `load + kg <= 100` keep the truck and add the weight, otherwise `truck + 1` and `load = kg`. Then group by truck.

## Solution

```sql
WITH RECURSIVE parcels(seq, parcel, kg) AS (
  VALUES (1, 'P1', 40), (2, 'P2', 35), (3, 'P3', 30), (4, 'P4', 20), (5, 'P5', 50), (6, 'P6', 50), (7, 'P7', 100), (8, 'P8', 10)
),
loading(seq, parcel, kg, truck, load) AS (
  SELECT seq, parcel, kg, 1, kg FROM parcels WHERE seq = 1
  UNION ALL
  SELECT p.seq, p.parcel, p.kg,
    CASE WHEN l.load + p.kg <= 100 THEN l.truck ELSE l.truck + 1 END,
    CASE WHEN l.load + p.kg <= 100 THEN l.load + p.kg ELSE p.kg END
  FROM loading AS l
  JOIN parcels AS p ON p.seq = l.seq + 1
)
SELECT truck, group_concat(parcel, ',' ORDER BY seq) AS parcels, SUM(kg) AS load_kg, 100 - SUM(kg) AS spare_kg
FROM loading
GROUP BY truck
ORDER BY truck;
```

## Expected result

| truck | parcels | load_kg | spare_kg |
| --- | --- | --- | --- |
| 1 | P1,P2 | 75 | 25 |
| 2 | P3,P4,P5 | 100 | 0 |
| 3 | P6 | 50 | 50 |
| 4 | P7 | 100 | 0 |
| 5 | P8 | 10 | 90 |

## Explanation

Some running totals reset on a condition that depends on the total itself ("start again when the next parcel would not fit"). Each row then depends on the previous row's result, which window functions cannot express, but a recursive CTE can: it processes one parcel per step and carries the current truck and load forward.

P1 and P2 make 75 kg; P3 would take it to 105, so truck 2 starts with P3. P3, P4 and P5 fill truck 2 to exactly 100 kg, which fits (the limit is inclusive), so P6 starts truck 3. P7 alone weighs the full 100 kg (truck 4), so P8 starts truck 5.

This greedy, in-order loading is what a loading dock does; it is not the optimal packing (that is a much harder problem), and the spare capacity column shows the cost of keeping the order.

**Common mistake:** `CAST(SUM(kg) OVER (ORDER BY seq) / 100 AS INTEGER)`, which splits parcels across trucks on paper whenever a running total crosses a multiple of 100.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE parcels(seq, parcel, kg) AS ( VALUES (1, 'P1', 40), (2, 'P2', 35), (3, 'P3', 30), (4, 'P4', 20), (5, 'P5', 50), (6, 'P6', 50), (7, 'P7', 100), (8, 'P8', 10) ), loading AS (SELECT seq, parcel, kg, CAST((SUM(kg) OVER (ORDER BY seq) - 1) / 100 AS INTEGER) + 1 AS truck FROM parcels) SELECT truck, group_concat(parcel, ',' ORDER BY seq) AS parcels, SUM(kg) AS load_kg, 100 - SUM(kg) AS spare_kg FROM loading GROUP BY truck ORDER BY truck;
```
