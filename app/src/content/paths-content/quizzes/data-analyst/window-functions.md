---
id: window-functions
title: Window functions
order: 9
difficulty: advanced
topic: OVER, PARTITION BY, ranking, LAG and LEAD
summary: Check that you can calculate across related rows while keeping every row.
duration: 5
---

## How does `COUNT(*) OVER (PARTITION BY genre)` differ from `COUNT(*) ... GROUP BY genre`?

Type: conceptual
Topic: Windows and GROUP BY
Difficulty: beginner

- [ ] They return exactly the same rows
- [x] The window keeps every row and adds the genre's count to each; `GROUP BY` returns one row per genre
- [ ] The window ignores `NULL` values and `GROUP BY` does not
- [ ] `GROUP BY` can only be used with `SUM`

### Explanation

A window function calculates over related rows without merging them, so six books stay six rows, each with its genre's count. `GROUP BY` collapses each genre into one row.

## Three genres have 4, 3 and 3 units. What does `RANK() OVER (ORDER BY units DESC)` return for them, in that order?

Type: predict-output
Topic: Ranking ties
Difficulty: intermediate

- [ ] 1, 2, 3
- [x] 1, 2, 2
- [ ] 1, 1, 2
- [ ] 1, 2, 4

### Explanation

`RANK()` gives tied rows the same rank. The two genres with 3 units are both ranked 2. A fourth genre after them would be ranked 4, because `RANK` skips the places the tie used.

## Which window returns the previous order date within the same customer?

Type: multiple-choice
Topic: LAG
Difficulty: intermediate

- [ ] `LAG(order_date) OVER (ORDER BY order_date)`
- [x] `LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)`
- [ ] `LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)`
- [ ] `MAX(order_date) OVER (PARTITION BY customer_id)`

### Explanation

`PARTITION BY customer_id` keeps each customer separate and `ORDER BY order_date` defines "previous". Without the partition, `LAG` would return another customer's order. `LEAD` looks forward, and `MAX` returns the latest date, not the previous one.

## Why does this query fail?

Type: find-the-error
Topic: Filtering windows
Difficulty: intermediate

```sql
SELECT title, ROW_NUMBER() OVER (ORDER BY price DESC) AS position
FROM books
WHERE ROW_NUMBER() OVER (ORDER BY price DESC) <= 3;
```

- [ ] `ROW_NUMBER` needs a `PARTITION BY`
- [ ] `<=` cannot be used with numbers
- [x] Window functions are calculated after `WHERE`, so they cannot be used in it
- [ ] The alias `position` is a reserved word

### Explanation

`WHERE` filters rows before any window is calculated. Calculate the window in a CTE, then filter it in the outer query.

## Which clause makes a window restart its calculation for each group?

Type: choose-the-clause
Topic: PARTITION BY
Difficulty: beginner

- [ ] `GROUP BY`
- [x] `PARTITION BY`
- [ ] `ORDER BY`
- [ ] `HAVING`

### Explanation

`PARTITION BY` splits the rows into separate windows inside `OVER (...)`. Unlike `GROUP BY`, it does not merge the rows of each group.
