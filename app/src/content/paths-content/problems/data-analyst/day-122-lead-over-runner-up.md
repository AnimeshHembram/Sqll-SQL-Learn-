---
id: da-day-122
title: The leader's margin over the runner-up
order: 122
difficulty: advanced
topic: Window functions
summary: Number rows deterministically and read the next row with LEAD, inside each region.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Read the following row with LEAD
  - Break ties deterministically
prerequisites:
  - Day 101
  - Day 102
---

## Task

For each region (in the starter query), find the **leader** and the **runner-up** by `sales`, ties broken alphabetically by `rep`, and how far ahead the leader is. Return `region`, `leader`, `runner_up` and `gap` (leader's sales minus runner-up's sales, 0 when they tie). A region with only one rep has `NULL` runner-up and gap. Sort by `region`.

## Starter query

```sql
WITH rep_sales(region, rep, sales) AS (
  VALUES
    ('East', 'Asha', 300), ('East', 'Ben', 260), ('East', 'Cara', 260),
    ('West', 'Dan', 410), ('West', 'Eli', 410), ('West', 'Fay', 200),
    ('North', 'Gus', 150)
)
SELECT region, rep, sales
FROM rep_sales
ORDER BY region, sales DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number the reps in each region with `ROW_NUMBER() OVER (PARTITION BY region ORDER BY sales DESC, rep)`; the leader is number 1.
3. In the same window, `LEAD(rep)` and `LEAD(sales)` give the next rep and their sales. Keep only the leader's row and subtract.

## Solution

```sql
WITH rep_sales(region, rep, sales) AS (
  VALUES
    ('East', 'Asha', 300), ('East', 'Ben', 260), ('East', 'Cara', 260),
    ('West', 'Dan', 410), ('West', 'Eli', 410), ('West', 'Fay', 200),
    ('North', 'Gus', 150)
),
ordered AS (
  SELECT region, rep, sales,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY sales DESC, rep) AS position,
    LEAD(rep) OVER (PARTITION BY region ORDER BY sales DESC, rep) AS next_rep,
    LEAD(sales) OVER (PARTITION BY region ORDER BY sales DESC, rep) AS next_sales
  FROM rep_sales
)
SELECT region, rep AS leader, next_rep AS runner_up, sales - next_sales AS gap
FROM ordered
WHERE position = 1
ORDER BY region;
```

## Expected result

| region | leader | runner_up | gap |
| --- | --- | --- | --- |
| East | Asha | Ben | 40 |
| North | Gus | NULL | NULL |
| West | Dan | Eli | 0 |

## Explanation

On the leader's row, `LEAD` already holds the runner-up, so one pass answers the question. The tie-breaker on `rep` makes "leader" well defined when two reps share the top figure: in the West, Dan and Eli both sold 410, so Dan leads by 0. North has one rep, so `LEAD` returns `NULL` and so does the gap.

**Common mistake:** filtering `RANK() = 1`. Tied leaders both get rank 1, the West appears twice, and the question of who is runner-up is lost.

## Wrong answers

Feedback: extra-rows

```sql
WITH rep_sales(region, rep, sales) AS ( VALUES ('East', 'Asha', 300), ('East', 'Ben', 260), ('East', 'Cara', 260), ('West', 'Dan', 410), ('West', 'Eli', 410), ('West', 'Fay', 200), ('North', 'Gus', 150) ), ordered AS (SELECT region, rep, sales, RANK() OVER (PARTITION BY region ORDER BY sales DESC) AS position, LEAD(rep) OVER (PARTITION BY region ORDER BY sales DESC, rep) AS next_rep, LEAD(sales) OVER (PARTITION BY region ORDER BY sales DESC, rep) AS next_sales FROM rep_sales) SELECT region, rep AS leader, next_rep AS runner_up, sales - next_sales AS gap FROM ordered WHERE position = 1 ORDER BY region;
```
