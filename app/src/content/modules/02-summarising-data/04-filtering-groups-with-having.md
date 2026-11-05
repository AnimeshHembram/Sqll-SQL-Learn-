---
id: filtering-groups-with-having
title: Filtering groups with HAVING
module: summarising-data
order: 4
level: beginner
duration: 12
summary: Keep only the groups that match a condition, and know when to use WHERE and when to use HAVING.
objectives:
  - Keep or remove whole groups with HAVING
  - Explain the difference between WHERE and HAVING
  - Use WHERE, GROUP BY, HAVING, ORDER BY and LIMIT together
---

`GROUP BY` gives you one row per group. Sometimes you only want **some** of those groups: genres with at least two books, authors whose average price is above 13. You cannot use `WHERE` for this, because the groups do not exist yet when `WHERE` runs. `HAVING` filters groups instead.

## The big idea

Go back to the piles of books sorted by genre. There are two different moments when you could throw things away:

- **Before** sorting into piles, you can remove individual books ("ignore books over 15"). That is `WHERE`.
- **After** the piles are made and counted, you can remove whole piles ("ignore piles with fewer than 2 books"). That is `HAVING`.

| | `WHERE` | `HAVING` |
| --- | --- | --- |
| Filters | single rows | whole groups |
| Runs | before `GROUP BY` | after `GROUP BY` |
| Can use aggregates such as `COUNT(*)` | no | yes |

## Syntax

```sql syntax
SELECT group_column, AGGREGATE(other_column) AS new_name
FROM table_name
WHERE row_condition
GROUP BY group_column
HAVING group_condition
ORDER BY column_name
LIMIT row_count;
```

- `HAVING` comes directly after `GROUP BY`.
- Its condition usually uses an aggregate, such as `COUNT(*) >= 2` or `AVG(price) > 13`.

## Examples

### Keep groups with at least two rows

Which genres have at least two books?

```sql
SELECT genre, COUNT(*) AS book_count
FROM books
GROUP BY genre
HAVING COUNT(*) >= 2
ORDER BY genre;
```

Expected output:

| genre | book_count |
| --- | --- |
| Fantasy | 2 |
| Mystery | 2 |

Science and Science fiction have one book each, so their groups are removed.

### Filter on an average

Which genres cost more than 13 on average? Sort the most expensive first:

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price
FROM books
GROUP BY genre
HAVING AVG(price) > 13
ORDER BY avg_price DESC;
```

| genre | avg_price |
| --- | --- |
| Science fiction | 18.00 |
| Mystery | 13.87 |
| Fantasy | 13.38 |

Only Science (average 9.99) is removed. The condition uses the **unrounded** average, so rounding can never change which groups are kept.

### WHERE and HAVING in one query

Both can appear in the same query, and each does its own job. Count only the books under 15, then keep the genres that still have at least two:

```sql
SELECT genre, COUNT(*) AS book_count
FROM books
WHERE price < 15
GROUP BY genre
HAVING COUNT(*) >= 2;
```

| genre | book_count |
| --- | --- |
| Mystery | 2 |

Fantasy is gone, even though it has two books. `WHERE` first removed *Rivers of Glass* (15.50), leaving Fantasy with only one book, and then `HAVING` removed that group.

## How the query runs

For the last example:

1. `FROM books` reads all 6 rows.
2. `WHERE price < 15` keeps 4 rows: *The Silent Orchard*, *Counting Stars*, *Paper Lanterns* and *A Quiet Ledger*.
3. `GROUP BY genre` makes three groups:

| Group | Books left | COUNT(*) | COUNT(*) >= 2 | Kept? |
| --- | --- | --- | --- | --- |
| Fantasy | Paper Lanterns | 1 | false | no |
| Mystery | The Silent Orchard, A Quiet Ledger | 2 | true | yes |
| Science | Counting Stars | 1 | false | no |

4. `HAVING COUNT(*) >= 2` keeps only the Mystery group.
5. `SELECT` returns one row for the remaining group.

The full order in which SQL processes a query is now:

1. `FROM`: which table
2. `WHERE`: which rows
3. `GROUP BY`: which groups
4. `HAVING`: which groups to keep
5. `SELECT`: which columns
6. `ORDER BY`: in which order
7. `LIMIT`: how many rows

> A simple way to choose: if the condition is about **one row** ("the price is under 15"), use `WHERE`. If it is about **a group** ("the genre has at least two books"), use `HAVING`.

## Common mistakes

**Putting an aggregate in WHERE.** When `WHERE` runs, no groups or counts exist yet:

```sql error
SELECT genre, COUNT(*) AS book_count FROM books WHERE COUNT(*) >= 2 GROUP BY genre;
```

SQLite answers with `misuse of aggregate: COUNT()`. Move the condition into `HAVING`.

**Writing HAVING before GROUP BY.** `HAVING` filters groups, so it must come after them:

```sql error
SELECT genre, COUNT(*) AS book_count FROM books HAVING COUNT(*) >= 2 GROUP BY genre;
```

This causes a syntax error. Write `GROUP BY genre HAVING COUNT(*) >= 2`.

**Using HAVING for a row condition.** This works, but it is the wrong tool:

```sql
SELECT genre, COUNT(*) AS book_count FROM books GROUP BY genre HAVING genre <> 'Science' ORDER BY genre;
```

| genre | book_count |
| --- | --- |
| Fantasy | 2 |
| Mystery | 2 |
| Science fiction | 1 |

The condition `genre <> 'Science'` is about single rows, so it belongs in `WHERE`. With `WHERE`, the database removes the rows before grouping instead of building a group and then throwing it away. On a large table that is much faster, and it makes the query's meaning clearer.

## Try it yourself

Try each task in the Practice space first, then compare with the answer.

**Task 1.** Which authors have more than one book? Return `author` and `books`.

```sql
SELECT author, COUNT(*) AS books FROM books GROUP BY author HAVING COUNT(*) > 1;
```

| author | books |
| --- | --- |
| Mira Das | 2 |

**Task 2.** Which customers have placed two or more orders? Using `orders`, return `customer_id` and `orders`, sorted by `customer_id`.

```sql
SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2 ORDER BY customer_id;
```

| customer_id | orders |
| --- | --- |
| 1 | 2 |
| 2 | 2 |

**Task 3.** Put it all together. Considering only books from 2018 or later, find the genres that have at least two such books, and return `genre` and `avg_price` (rounded to 2 places), most expensive first.

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price
FROM books
WHERE year >= 2018
GROUP BY genre
HAVING COUNT(*) >= 2
ORDER BY avg_price DESC;
```

| genre | avg_price |
| --- | --- |
| Mystery | 13.87 |
| Fantasy | 13.38 |

## Key takeaways

- `HAVING` keeps or removes **whole groups**; `WHERE` keeps or removes **single rows**.
- `WHERE` runs before `GROUP BY`; `HAVING` runs after it, so only `HAVING` can use aggregates.
- Put row conditions in `WHERE` and group conditions in `HAVING`.
- Clause order: `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`.
- Processing order: `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`.
- You can now ask summary questions about any single table. Practise them in the challenges "Count the books in each genre", "Summarise the prices" and "Genres with a high average price".
