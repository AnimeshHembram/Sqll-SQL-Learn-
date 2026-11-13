---
id: da-day-345
title: A weekly chart with new entries and drop-outs
order: 345
difficulty: advanced
topic: Reporting
summary: Rank products in two weeks and label each as up, down, same, new or dropped out.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare rankings between periods
  - Label entries and exits
prerequisites:
  - Day 124
  - Day 243
---

## Task

Like a music chart, rank products by units in week 10 and week 11 (starter query; rank 1 is the highest, no ties occur). Show every product that appears in **either** week: `product`, `last_rank` (week 10, `NULL` if absent), `this_rank` (week 11, `NULL` if absent) and `move`: `'new'`, `'dropped out'`, `'up 2'` / `'down 1'` style labels, or `'same'`.

Sort products in this week's chart by `this_rank`, followed by dropped-out products by `last_rank`.

## Starter query

```sql
WITH weekly_units(week, product, units) AS (
  VALUES
    (10, 'Atlas', 500), (10, 'Beacon', 420), (10, 'Comet', 380), (10, 'Delta', 300), (10, 'Ember', 150),
    (11, 'Atlas', 480), (11, 'Beacon', 450), (11, 'Comet', 300), (11, 'Delta', 360), (11, 'Fable', 200)
)
SELECT week, product, units
FROM weekly_units
ORDER BY week, units DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Rank within each week with `RANK() OVER (PARTITION BY week ORDER BY units DESC)`, then pivot the two weeks per product with conditional `MAX` grouped by product, which keeps products present in only one week.
3. Move: `CASE WHEN last IS NULL THEN 'new' WHEN this IS NULL THEN 'dropped out' WHEN this < last THEN 'up ' || (last - this) ...`. Sort with `ORDER BY this_rank IS NULL, this_rank, last_rank`.

## Solution

```sql
WITH weekly_units(week, product, units) AS (
  VALUES
    (10, 'Atlas', 500), (10, 'Beacon', 420), (10, 'Comet', 380), (10, 'Delta', 300), (10, 'Ember', 150),
    (11, 'Atlas', 480), (11, 'Beacon', 450), (11, 'Comet', 300), (11, 'Delta', 360), (11, 'Fable', 200)
),
ranked AS (
  SELECT week, product, RANK() OVER (PARTITION BY week ORDER BY units DESC) AS rnk FROM weekly_units
),
pivoted AS (
  SELECT product, MAX(CASE WHEN week = 10 THEN rnk END) AS last_rank, MAX(CASE WHEN week = 11 THEN rnk END) AS this_rank
  FROM ranked
  GROUP BY product
)
SELECT product, last_rank, this_rank,
  CASE WHEN last_rank IS NULL THEN 'new'
       WHEN this_rank IS NULL THEN 'dropped out'
       WHEN this_rank < last_rank THEN 'up ' || (last_rank - this_rank)
       WHEN this_rank > last_rank THEN 'down ' || (this_rank - last_rank)
       ELSE 'same' END AS move
FROM pivoted
ORDER BY this_rank IS NULL, this_rank, last_rank;
```

## Expected result

| product | last_rank | this_rank | move |
| --- | --- | --- | --- |
| Atlas | 1 | 1 | same |
| Beacon | 2 | 2 | same |
| Delta | 4 | 3 | up 1 |
| Comet | 3 | 4 | down 1 |
| Fable | NULL | 5 | new |
| Ember | 5 | NULL | dropped out |

## Explanation

A chart compares two rankings, and products can enter or leave between them. Pivoting both weeks' ranks per product with conditional `MAX` keeps everyone who appeared in either week: Fable is new at number 5, and Ember, last week's number 5, has dropped out.

Moves compare the ranks: Delta climbed from 4 to 3 and Comet slipped from 3 to 4, while Atlas and Beacon held. Sorting this week's chart by rank and then listing the drop-outs underneath is how music charts present the same information.

**Common mistake:** self-joining week 10 to week 11 with an inner join. Only products present in both weeks remain, so the new entry and the drop-out, usually the most interesting rows, vanish.

## Wrong answers

Feedback: missing-rows

```sql
WITH weekly_units(week, product, units) AS ( VALUES (10, 'Atlas', 500), (10, 'Beacon', 420), (10, 'Comet', 380), (10, 'Delta', 300), (10, 'Ember', 150), (11, 'Atlas', 480), (11, 'Beacon', 450), (11, 'Comet', 300), (11, 'Delta', 360), (11, 'Fable', 200) ), ranked AS (SELECT week, product, RANK() OVER (PARTITION BY week ORDER BY units DESC) AS rnk FROM weekly_units) SELECT a.product, a.rnk AS last_rank, b.rnk AS this_rank, CASE WHEN b.rnk < a.rnk THEN 'up ' || (a.rnk - b.rnk) WHEN b.rnk > a.rnk THEN 'down ' || (b.rnk - a.rnk) ELSE 'same' END AS move FROM ranked AS a JOIN ranked AS b ON b.product = a.product AND b.week = 11 WHERE a.week = 10 ORDER BY this_rank;
```
