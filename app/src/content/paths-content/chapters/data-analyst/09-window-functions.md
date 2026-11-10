---
id: window-functions
title: Window functions
module: data-analyst
order: 9
level: advanced
duration: 45
summary: Calculate values across related rows, such as rankings, group totals and the previous row, while keeping every row in the result.
objectives:
  - Explain how a window function differs from GROUP BY
  - Number and rank rows with ROW_NUMBER, RANK and DENSE_RANK, overall and within partitions
  - Put a group's total or average beside each row with an aggregate over a window
  - Read values from the previous or next row with LAG and LEAD
---

`GROUP BY` answers questions about groups by collapsing each group into one row. Many analysis questions need both at once: each row **and** something about its group. "Each book with the number of books in its genre." "Each order with the customer's previous order date." "Each book's price rank." **Window functions** calculate a value from a set of related rows (the *window*) and attach it to every row, without collapsing anything.

## Why analysts use this

Before window functions, these questions needed self-joins or correlated subqueries that were slow and hard to read. With them, analysts can:

- rank items (best sellers, newest customers) overall or within each category,
- compare each row with its group (a book's price against its genre's average),
- compare each row with the one before it (days since the previous order, change from last month),
- build running totals and moving averages (the next chapter).

## Syntax

```sql syntax
function_name(...) OVER (
  PARTITION BY group_column   -- optional: restart for each group
  ORDER BY sort_column        -- optional for aggregates, needed for ranking, LAG and LEAD
)
```

| Function | What it returns for each row |
| --- | --- |
| `ROW_NUMBER()` | 1, 2, 3, ... in the window's order; ties get different numbers |
| `RANK()` | The position, with ties sharing a rank and the next rank skipped (1, 2, 2, 4) |
| `DENSE_RANK()` | The position, with ties sharing a rank and no gap (1, 2, 2, 3) |
| `SUM(x)`, `AVG(x)`, `COUNT(*)`, `MIN(x)`, `MAX(x)` | The aggregate over the window |
| `LAG(x)` | `x` from the previous row of the window, or `NULL` |
| `LEAD(x)` | `x` from the next row of the window, or `NULL` |

- `OVER ()` with nothing inside makes the whole result one window.
- `PARTITION BY` splits the rows into separate windows, like groups that are not collapsed.
- Window functions are calculated after `WHERE`, `GROUP BY` and `HAVING`, so they **cannot be used in `WHERE`**. To filter on one, calculate it in a CTE first (see the chapter on top N per group).

## Examples

### GROUP BY collapses, a window keeps every row

Compare a count per genre with `GROUP BY` and with a window:

```sql
SELECT genre, COUNT(*) AS books
FROM books
GROUP BY genre
ORDER BY genre;
```

Expected output:

| genre | books |
| --- | --- |
| Fantasy | 2 |
| Mystery | 2 |
| Science | 1 |
| Science fiction | 1 |

```sql
SELECT title, genre, COUNT(*) OVER (PARTITION BY genre) AS books_in_genre
FROM books
ORDER BY genre, title;
```

| title | genre | books_in_genre |
| --- | --- | --- |
| Paper Lanterns | Fantasy | 2 |
| Rivers of Glass | Fantasy | 2 |
| A Quiet Ledger | Mystery | 2 |
| The Silent Orchard | Mystery | 2 |
| Counting Stars | Science | 1 |
| The Last Signal | Science fiction | 1 |

The window version keeps all six books and puts the genre's count beside each one.

### Numbering and ranking

`ROW_NUMBER`, `RANK` and `DENSE_RANK` differ only when there are ties. Units ordered per genre (any status) has a tie:

```sql
SELECT b.genre, SUM(oi.quantity) AS units,
  ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity) DESC, b.genre) AS row_number,
  RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS dense_rank
FROM order_items AS oi
JOIN books AS b ON b.id = oi.book_id
GROUP BY b.genre
ORDER BY units DESC, b.genre;
```

| genre | units | row_number | rank | dense_rank |
| --- | --- | --- | --- | --- |
| Fantasy | 4 | 1 | 1 | 1 |
| Mystery | 3 | 2 | 2 | 2 |
| Science | 3 | 3 | 2 | 2 |
| Science fiction | 1 | 4 | 4 | 3 |

Mystery and Science both have 3 units. `ROW_NUMBER` still gives them different numbers (the extra `b.genre` in its `ORDER BY` decides which comes first), `RANK` gives both 2 and skips 3, and `DENSE_RANK` gives both 2 and continues with 3. A window can also rank aggregates, as here, because it is calculated after `GROUP BY`.

### Ranking within each group

`PARTITION BY` restarts the numbering for every group. The newest book of each author gets number 1:

```sql
SELECT author, title, year,
  ROW_NUMBER() OVER (PARTITION BY author ORDER BY year DESC) AS newest_first
FROM books
ORDER BY author, newest_first;
```

| author | title | year | newest_first |
| --- | --- | --- | --- |
| Ana Ruiz | A Quiet Ledger | 2020 | 1 |
| Ken Ito | Paper Lanterns | 2019 | 1 |
| Mira Das | The Last Signal | 2023 | 1 |
| Mira Das | The Silent Orchard | 2018 | 2 |
| Priya Nair | Counting Stars | 2015 | 1 |
| Tomas Varga | Rivers of Glass | 2021 | 1 |

### A group's average beside each row

An aggregate over a partition lets each row be compared with its group:

```sql
SELECT title, genre, price,
  ROUND(AVG(price) OVER (PARTITION BY genre), 2) AS genre_avg,
  ROUND(price - AVG(price) OVER (PARTITION BY genre), 2) AS above_genre_avg
FROM books
ORDER BY genre, price;
```

| title | genre | price | genre_avg | above_genre_avg |
| --- | --- | --- | --- | --- |
| Paper Lanterns | Fantasy | 11.25 | 13.38 | -2.13 |
| Rivers of Glass | Fantasy | 15.5 | 13.38 | 2.13 |
| The Silent Orchard | Mystery | 12.99 | 13.87 | -0.88 |
| A Quiet Ledger | Mystery | 14.75 | 13.87 | 0.88 |
| Counting Stars | Science | 9.99 | 9.99 | 0 |
| The Last Signal | Science fiction | 18 | 18 | 0 |

A positive difference means the book is pricier than its genre's average. Books that are alone in their genre are exactly at their own average.

### The previous and next row

`LAG` and `LEAD` read a value from another row of the window. Here, each customer's orders with the date of their previous and next order:

```sql
SELECT customer_id, order_date,
  LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS previous_order,
  LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_order
FROM orders
ORDER BY customer_id, order_date;
```

| customer_id | order_date | previous_order | next_order |
| --- | --- | --- | --- |
| 1 | 2025-01-10 | NULL | 2025-02-05 |
| 1 | 2025-02-05 | 2025-01-10 | NULL |
| 2 | 2025-01-18 | NULL | 2025-03-09 |
| 2 | 2025-03-09 | 2025-01-18 | NULL |
| 3 | 2025-02-14 | NULL | NULL |
| 4 | 2025-03-01 | NULL | NULL |

A first order has no previous row, so `LAG` returns `NULL`; a last order has no next row.

## How the query runs

For "a group's average beside each row":

1. `FROM books` reads all six rows. There is no `WHERE` or `GROUP BY`.
2. The window `AVG(price) OVER (PARTITION BY genre)` splits the rows into one window per genre and calculates each window's average.
3. Every row receives its own genre's average; no rows are merged.
4. `ORDER BY genre, price` sorts the final rows.

## Common mistakes

**Filtering on a window function in `WHERE`.** `WHERE` runs before the window is calculated:

```sql error
SELECT title, ROW_NUMBER() OVER (ORDER BY price DESC) AS position
FROM books
WHERE ROW_NUMBER() OVER (ORDER BY price DESC) <= 3;
```

Calculate the window in a CTE, then filter in the outer query.

**Forgetting `ORDER BY` inside `OVER`.** Without it, `ROW_NUMBER()` numbers rows in whatever order SQLite happens to read them, and `LAG` has no meaningful "previous" row. The `ORDER BY` at the end of the query sorts the output but does not affect the window.

**Choosing the wrong ranking function.** `ROW_NUMBER` breaks ties arbitrarily, so "the top 2" can drop a tied row without warning. Use `RANK` when ties should share a place.

**Expecting a window to reduce rows.** `COUNT(*) OVER (...)` returns a value on every row. If you want one row per group, use `GROUP BY`.

## Key takeaways

- A window function calculates over related rows and keeps every row; `GROUP BY` collapses rows.
- `PARTITION BY` restarts the calculation for each group; `ORDER BY` inside `OVER` sets the order for ranking, `LAG` and `LEAD`.
- `ROW_NUMBER`, `RANK` and `DENSE_RANK` differ only on ties.
- `SUM`, `AVG`, `COUNT`, `MIN` and `MAX` can all be used over a window to compare a row with its group.
- Window functions cannot appear in `WHERE`; filter on them from a CTE.
