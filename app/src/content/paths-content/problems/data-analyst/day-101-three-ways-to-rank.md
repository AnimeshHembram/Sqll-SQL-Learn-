---
id: da-day-101
title: Three ways to rank sales reps
order: 101
difficulty: intermediate
topic: Window functions
summary: Compare ROW_NUMBER, RANK and DENSE_RANK on the same tied data.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Choose between ROW_NUMBER, RANK and DENSE_RANK
  - Restart a ranking per group with PARTITION BY
prerequisites:
  - Day 38
  - Day 61
---

## Task

Rank the sales reps (in the starter query) **within their region** by `sales`, highest first, in three ways side by side: `row_num` with `ROW_NUMBER()` (ties broken by `rep` name), `rnk` with `RANK()` and `dense` with `DENSE_RANK()`. Return `rep`, `region`, `sales`, `row_num`, `rnk` and `dense`. Sort by `region`, then `row_num`.

## Starter query

```sql
WITH rep_sales(rep, region, sales) AS (
  VALUES
    ('Anil', 'North', 120), ('Bea', 'North', 150), ('Chen', 'North', 150), ('Dev', 'North', 90),
    ('Esha', 'South', 200), ('Farid', 'South', 80), ('Gita', 'South', 80), ('Hari', 'South', 80)
)
SELECT rep, region, sales
FROM rep_sales
ORDER BY region, sales DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Each ranking needs `OVER (PARTITION BY region ORDER BY sales DESC)`, so the numbers restart for each region.
3. Only `ROW_NUMBER()` needs a tie-breaker to be repeatable: `ROW_NUMBER() OVER (PARTITION BY region ORDER BY sales DESC, rep)`.

## Solution

```sql
WITH rep_sales(rep, region, sales) AS (
  VALUES
    ('Anil', 'North', 120), ('Bea', 'North', 150), ('Chen', 'North', 150), ('Dev', 'North', 90),
    ('Esha', 'South', 200), ('Farid', 'South', 80), ('Gita', 'South', 80), ('Hari', 'South', 80)
)
SELECT rep, region, sales,
  ROW_NUMBER() OVER (PARTITION BY region ORDER BY sales DESC, rep) AS row_num,
  RANK() OVER (PARTITION BY region ORDER BY sales DESC) AS rnk,
  DENSE_RANK() OVER (PARTITION BY region ORDER BY sales DESC) AS dense
FROM rep_sales
ORDER BY region, row_num;
```

## Expected result

| rep | region | sales | row_num | rnk | dense |
| --- | --- | --- | --- | --- | --- |
| Bea | North | 150 | 1 | 1 | 1 |
| Chen | North | 150 | 2 | 1 | 1 |
| Anil | North | 120 | 3 | 3 | 2 |
| Dev | North | 90 | 4 | 4 | 3 |
| Esha | South | 200 | 1 | 1 | 1 |
| Farid | South | 80 | 2 | 2 | 2 |
| Gita | South | 80 | 3 | 2 | 2 |
| Hari | South | 80 | 4 | 2 | 2 |

## Explanation

The three functions only differ on ties:

- `ROW_NUMBER` always counts 1, 2, 3, 4 and must be given a tie-breaker, or tied rows can swap between runs.
- `RANK` gives ties the same number and then skips: Bea and Chen are both 1, so Anil is 3. Use it for "position in a league table".
- `DENSE_RANK` gives ties the same number without gaps: Anil is 2. Use it for "level" or "the 2nd highest value".

In the South, three reps tie on 80: `RANK` and `DENSE_RANK` both call them 2, but a fifth rep below them would be 5 with `RANK` and 3 with `DENSE_RANK`.

**Common mistake:** leaving out `PARTITION BY region`. The ranks then run across both regions, and Esha's 200 makes every North rep one place lower.

## Wrong answers

Feedback: incorrect-output

```sql
WITH rep_sales(rep, region, sales) AS ( VALUES ('Anil', 'North', 120), ('Bea', 'North', 150), ('Chen', 'North', 150), ('Dev', 'North', 90), ('Esha', 'South', 200), ('Farid', 'South', 80), ('Gita', 'South', 80), ('Hari', 'South', 80) ) SELECT rep, region, sales, ROW_NUMBER() OVER (ORDER BY sales DESC, rep) AS row_num, RANK() OVER (ORDER BY sales DESC) AS rnk, DENSE_RANK() OVER (ORDER BY sales DESC) AS dense FROM rep_sales ORDER BY region, row_num;
```
