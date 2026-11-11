---
id: da-day-124
title: Who moved up the ranking?
order: 124
difficulty: advanced
topic: Window functions
summary: Rank two periods separately, then compare the ranks with a FULL OUTER JOIN.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare rankings between two periods
  - Report entries and exits with FULL OUTER JOIN
prerequisites:
  - Day 95
  - Day 101
---

## Task

Rank products by revenue in Q1 and in Q2 separately (in the starter query), using `RANK()` so ties share a rank. Return every product from either quarter: `product`, `q1_rank`, `q2_rank`, `movement` (`q1_rank - q2_rank`, so positive means it moved up; `NULL` if it is missing from a quarter) and `status`: `'new'` (only in Q2), `'dropped'` (only in Q1), or `'up'`, `'down'` or `'same'`. Sort by `product`.

## Starter query

```sql
WITH product_sales(product, quarter, revenue) AS (
  VALUES
    ('A', 'Q1', 500), ('B', 'Q1', 400), ('C', 'Q1', 400), ('D', 'Q1', 300), ('E', 'Q1', 100),
    ('A', 'Q2', 450), ('B', 'Q2', 520), ('C', 'Q2', 300), ('D', 'Q2', 300), ('F', 'Q2', 350)
)
SELECT product, quarter, revenue
FROM product_sales
ORDER BY quarter, revenue DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Two CTEs: `q1` with `RANK() OVER (ORDER BY revenue DESC)` over the Q1 rows, and `q2` the same for Q2.
3. `FULL OUTER JOIN` them on `product`, use `COALESCE(q1.product, q2.product)`, and decide the status with `CASE WHEN q1.product IS NULL THEN 'new' WHEN q2.product IS NULL THEN 'dropped' ...`.

## Solution

```sql
WITH product_sales(product, quarter, revenue) AS (
  VALUES
    ('A', 'Q1', 500), ('B', 'Q1', 400), ('C', 'Q1', 400), ('D', 'Q1', 300), ('E', 'Q1', 100),
    ('A', 'Q2', 450), ('B', 'Q2', 520), ('C', 'Q2', 300), ('D', 'Q2', 300), ('F', 'Q2', 350)
),
q1 AS (
  SELECT product, RANK() OVER (ORDER BY revenue DESC) AS rnk FROM product_sales WHERE quarter = 'Q1'
),
q2 AS (
  SELECT product, RANK() OVER (ORDER BY revenue DESC) AS rnk FROM product_sales WHERE quarter = 'Q2'
)
SELECT COALESCE(q1.product, q2.product) AS product,
  q1.rnk AS q1_rank,
  q2.rnk AS q2_rank,
  q1.rnk - q2.rnk AS movement,
  CASE
    WHEN q1.product IS NULL THEN 'new'
    WHEN q2.product IS NULL THEN 'dropped'
    WHEN q1.rnk > q2.rnk THEN 'up'
    WHEN q1.rnk < q2.rnk THEN 'down'
    ELSE 'same'
  END AS status
FROM q1
FULL OUTER JOIN q2 ON q2.product = q1.product
ORDER BY product;
```

## Expected result

| product | q1_rank | q2_rank | movement | status |
| --- | --- | --- | --- | --- |
| A | 1 | 2 | -1 | down |
| B | 2 | 1 | 1 | up |
| C | 2 | 4 | -2 | down |
| D | 4 | 4 | 0 | same |
| E | 5 | NULL | NULL | dropped |
| F | NULL | 3 | NULL | new |

## Explanation

Ranks must be calculated **within each quarter**, before the comparison; ranking the joined rows would mix the periods. A lower rank number is better, so `q1_rank - q2_rank` is positive when a product climbs.

B and C tied for 2nd in Q1. B moved to 1st; C fell to a tie for 4th with D, which therefore did not move. F is new in 3rd place, and E dropped out.

**Common mistake:** `ROW_NUMBER()` instead of `RANK()`. Tied products get different positions in an arbitrary order, and "movement" then partly measures that order rather than performance.

## Wrong answers

Feedback: incorrect-output

```sql
WITH product_sales(product, quarter, revenue) AS ( VALUES ('A', 'Q1', 500), ('B', 'Q1', 400), ('C', 'Q1', 400), ('D', 'Q1', 300), ('E', 'Q1', 100), ('A', 'Q2', 450), ('B', 'Q2', 520), ('C', 'Q2', 300), ('D', 'Q2', 300), ('F', 'Q2', 350) ), q1 AS (SELECT product, ROW_NUMBER() OVER (ORDER BY revenue DESC, product) AS rnk FROM product_sales WHERE quarter = 'Q1'), q2 AS (SELECT product, ROW_NUMBER() OVER (ORDER BY revenue DESC, product) AS rnk FROM product_sales WHERE quarter = 'Q2') SELECT COALESCE(q1.product, q2.product) AS product, q1.rnk AS q1_rank, q2.rnk AS q2_rank, q1.rnk - q2.rnk AS movement, CASE WHEN q1.product IS NULL THEN 'new' WHEN q2.product IS NULL THEN 'dropped' WHEN q1.rnk > q2.rnk THEN 'up' WHEN q1.rnk < q2.rnk THEN 'down' ELSE 'same' END AS status FROM q1 FULL OUTER JOIN q2 ON q2.product = q1.product ORDER BY product;
```
