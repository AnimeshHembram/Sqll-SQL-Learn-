---
id: grouping-with-group-by
title: Grouping rows with GROUP BY
module: summarising-data
order: 3
level: beginner
duration: 14
summary: Split rows into groups and calculate a count, total or average for each group.
objectives:
  - Explain what GROUP BY does to the rows of a table
  - Calculate an aggregate for each group
  - Combine WHERE, GROUP BY and ORDER BY in one query
  - Choose which columns are allowed next to GROUP BY
---

The aggregate functions so far summarised the **whole table** into one row. Usually you want a summary **per category**: the number of books *in each genre*, the average price *per author*. `GROUP BY` does this.

## The big idea

Imagine tipping all the books onto a table and sorting them into **piles by genre**: a Fantasy pile, a Mystery pile, a Science pile and a Science fiction pile. Then you count each pile.

That is exactly what `GROUP BY genre` does:

1. It makes **one group for each different value** of `genre`.
2. Every row goes into the group that matches its genre.
3. Aggregates such as `COUNT(*)` are calculated **separately for each group**.
4. The result has **one row per group**.

Here are the books sorted by genre, so you can see the piles:

```sql
SELECT genre, title, price FROM books ORDER BY genre;
```

| genre | title | price |
| --- | --- | --- |
| Fantasy | Rivers of Glass | 15.50 |
| Fantasy | Paper Lanterns | 11.25 |
| Mystery | The Silent Orchard | 12.99 |
| Mystery | A Quiet Ledger | 14.75 |
| Science | Counting Stars | 9.99 |
| Science fiction | The Last Signal | 18.00 |

Four genres, so `GROUP BY genre` will make four groups.

## Syntax

```sql syntax
SELECT group_column, AGGREGATE(other_column) AS new_name
FROM table_name
WHERE condition
GROUP BY group_column
ORDER BY column_name;
```

- `GROUP BY` comes **after** `WHERE` and **before** `ORDER BY`.
- After `SELECT`, list the column you group by, plus any aggregates.
- `WHERE` and `ORDER BY` are optional, as always.

## Examples

### Count the books in each genre

```sql
SELECT genre, COUNT(*) AS book_count FROM books GROUP BY genre;
```

Expected output:

| genre | book_count |
| --- | --- |
| Fantasy | 2 |
| Mystery | 2 |
| Science | 1 |
| Science fiction | 1 |

Six rows went in; four rows, one per genre, came out.

> SQLite returns these groups in alphabetical order, but SQL does not promise any order. Add `ORDER BY` whenever the order matters, as the next examples do.

### Several summaries per group

Any aggregate works per group. Here is a price summary for each genre:

```sql
SELECT genre, MIN(price) AS cheapest, MAX(price) AS most_expensive, ROUND(AVG(price), 2) AS average_price
FROM books
GROUP BY genre
ORDER BY genre;
```

| genre | cheapest | most_expensive | average_price |
| --- | --- | --- | --- |
| Fantasy | 11.25 | 15.50 | 13.38 |
| Mystery | 12.99 | 14.75 | 13.87 |
| Science | 9.99 | 9.99 | 9.99 |
| Science fiction | 18.00 | 18.00 | 18.00 |

Science has only one book, so its cheapest, most expensive and average price are all the same.

### Sort the groups

Which authors have the most books? Sort by the count, highest first, and by name to break ties:

```sql
SELECT author, COUNT(*) AS books
FROM books
GROUP BY author
ORDER BY books DESC, author;
```

| author | books |
| --- | --- |
| Mira Das | 2 |
| Ana Ruiz | 1 |
| Ken Ito | 1 |
| Priya Nair | 1 |
| Tomas Varga | 1 |

You can sort by the name you gave the aggregate (`books`), because `ORDER BY` runs after the groups are calculated.

### Filter rows first with WHERE

`WHERE` removes rows **before** they are grouped. How many books from 2019 or later are there in each genre?

```sql
SELECT genre, COUNT(*) AS recent_books
FROM books
WHERE year >= 2019
GROUP BY genre
ORDER BY genre;
```

| genre | recent_books |
| --- | --- |
| Fantasy | 2 |
| Mystery | 1 |
| Science fiction | 1 |

Science disappears completely: its only book is from 2015, so no rows are left to make a Science group.

### Group by more than one column

List two columns in `GROUP BY` and you get one group for each **combination** of values:

```sql
SELECT genre, author, COUNT(*) AS books
FROM books
GROUP BY genre, author
ORDER BY genre, author;
```

| genre | author | books |
| --- | --- | --- |
| Fantasy | Ken Ito | 1 |
| Fantasy | Tomas Varga | 1 |
| Mystery | Ana Ruiz | 1 |
| Mystery | Mira Das | 1 |
| Science | Priya Nair | 1 |
| Science fiction | Mira Das | 1 |

Mira Das appears twice, because she has a book in two different genres.

## How the query runs

For `SELECT genre, COUNT(*) AS recent_books FROM books WHERE year >= 2019 GROUP BY genre ORDER BY genre;`:

1. `FROM books` reads all 6 rows.
2. `WHERE year >= 2019` keeps 4 rows.
3. `GROUP BY genre` sorts those 4 rows into piles:

| Group | Rows in the group | COUNT(*) |
| --- | --- | --- |
| Fantasy | Rivers of Glass (2021), Paper Lanterns (2019) | 2 |
| Mystery | A Quiet Ledger (2020) | 1 |
| Science fiction | The Last Signal (2023) | 1 |

4. `SELECT` produces **one row per group**: the genre and its count.
5. `ORDER BY genre` sorts those rows.

The clauses are written as `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`, and processed as `FROM`, `WHERE`, `GROUP BY`, `SELECT`, `ORDER BY`, `LIMIT`.

## Common mistakes

**Selecting a column that is not grouped.** Each group becomes one row, so each column must have **one value per group**. A genre group has two titles, so which title should it show?

```sql
SELECT genre, title FROM books GROUP BY genre;
```

| genre | title |
| --- | --- |
| Fantasy | Rivers of Glass |
| Mystery | The Silent Orchard |
| Science | Counting Stars |
| Science fiction | The Last Signal |

SQLite runs this and picks a title from each group, which is misleading: *Paper Lanterns* is also Fantasy but is not shown. PostgreSQL and SQL Server reject the query. **Rule:** every column after `SELECT` must either be in `GROUP BY` or be inside an aggregate.

**Forgetting GROUP BY.** Without it, the whole table is one group, so you get one row instead of one per genre:

```sql
SELECT genre, COUNT(*) AS book_count FROM books;
```

| genre | book_count |
| --- | --- |
| Mystery | 6 |

The count of 6 is for **all** books; "Mystery" is just one genre SQLite happened to pick. If you see a single row when you expected several, check for a missing `GROUP BY`.

**Putting GROUP BY in the wrong place.** It must come after `WHERE` and before `ORDER BY`:

```sql error
SELECT genre, COUNT(*) AS book_count FROM books ORDER BY genre GROUP BY genre;
```

This causes a syntax error. Write `GROUP BY genre ORDER BY genre`.

## Try it yourself

Try each task in the Practice space first, then compare with the answer.

**Task 1.** How many orders are there with each status? Return `status` and `orders`, sorted by status.

```sql
SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY status;
```

| status | orders |
| --- | --- |
| cancelled | 1 |
| delivered | 3 |
| shipped | 2 |

**Task 2.** How many copies are in each order? Using `order_items`, return `order_id` and `copies` (the total `quantity`), sorted by `order_id`.

```sql
SELECT order_id, SUM(quantity) AS copies FROM order_items GROUP BY order_id ORDER BY order_id;
```

| order_id | copies |
| --- | --- |
| 1 | 3 |
| 2 | 1 |
| 3 | 2 |
| 4 | 1 |
| 5 | 3 |
| 6 | 1 |

**Task 3.** How many customers live in each city? Return `city` and `customers`, sorted by city. Look closely at the first row.

```sql
SELECT city, COUNT(*) AS customers FROM customers GROUP BY city ORDER BY city;
```

| city | customers |
| --- | --- |
| NULL | 1 |
| Bangalore | 2 |
| Chennai | 1 |
| Mumbai | 1 |

Sofia Rossi has no city. `GROUP BY` puts all the `NULL` values together in **one group**, and SQLite sorts `NULL` before any other value.

## Key takeaways

- `GROUP BY column` makes one group per different value and returns **one row per group**.
- Aggregates such as `COUNT`, `SUM` and `AVG` are calculated separately for each group.
- `WHERE` removes rows **before** grouping; `ORDER BY` sorts the groups **after**.
- Every column after `SELECT` must be in `GROUP BY` or inside an aggregate.
- Clause order: `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`.
