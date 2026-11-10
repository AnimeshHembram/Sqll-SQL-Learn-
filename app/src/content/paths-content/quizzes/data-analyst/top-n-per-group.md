---
id: top-n-per-group
title: Top N per group
order: 11
difficulty: advanced
topic: Picking rows per group and handling ties
summary: Check that you can return the best, latest or Nth row of each group.
duration: 5
---

## Why can `SELECT genre, MAX(price) FROM books GROUP BY genre` not tell you which book is the most expensive in each genre?

Type: conceptual
Topic: GROUP BY limits
Difficulty: beginner

- [ ] `MAX` does not work on prices
- [x] `GROUP BY` returns aggregates per group, not the other columns of the row that holds the maximum
- [ ] `GROUP BY` sorts the rows randomly
- [ ] It can, if you add `ORDER BY price`

### Explanation

Each group collapses into one row of aggregates. To keep the whole row of the top book, number the books within each genre with a window function and keep number 1.

## A CTE `ranked` numbers each customer's orders with `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn`. Which outer query returns each customer's latest order?

Type: multiple-choice
Topic: Latest row per group
Difficulty: intermediate

- [ ] `SELECT * FROM ranked ORDER BY rn LIMIT 1`
- [x] `SELECT * FROM ranked WHERE rn = 1`
- [ ] `SELECT * FROM ranked WHERE rn = MAX(rn)`
- [ ] `SELECT MAX(rn) FROM ranked GROUP BY customer_id`

### Explanation

Within each customer, the newest order is numbered 1, so `WHERE rn = 1` keeps one row per customer. `LIMIT 1` keeps a single row for the whole table.

## Two mystery books tie for first place. Which function keeps both when you filter on `= 1`?

Type: choose-the-clause
Topic: Ties
Difficulty: intermediate

- [ ] `ROW_NUMBER()`
- [x] `RANK()`
- [ ] `LAG()`
- [ ] `NTILE(1)`

### Explanation

`RANK()` gives tied rows the same rank, so both books are ranked 1. `ROW_NUMBER()` always gives different numbers, so one of the tied books would be numbered 2 and dropped.

## What does this query return?

Type: predict-output
Topic: LIMIT is not per group
Difficulty: intermediate

```sql
SELECT genre, title FROM books ORDER BY price DESC LIMIT 4;
```

- [ ] The most expensive book in each of the four genres
- [x] The four most expensive books overall, whatever their genres
- [ ] Four rows per genre
- [ ] An error, because `LIMIT` needs `GROUP BY`

### Explanation

`LIMIT` cuts the whole sorted result after four rows. In this data, two mystery books are among the four most expensive and no science book is, so it is not "one per genre".

## Why add `o.id DESC` to `ORDER BY o.order_date DESC` when choosing each customer's latest order?

Type: conceptual
Topic: Tie-breakers
Difficulty: advanced

- [ ] To make the query faster
- [ ] Because `ROW_NUMBER` requires two sort columns
- [x] So that two orders on the same date are always ordered the same way and the same one is chosen every time
- [ ] To include cancelled orders

### Explanation

If two orders share a date, the window would number them in an unpredictable order, and the "latest" order could change between runs. A tie-breaker column makes the order unique.
