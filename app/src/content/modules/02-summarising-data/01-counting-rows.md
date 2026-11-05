---
id: counting-rows
title: Counting rows with COUNT
module: summarising-data
order: 1
level: beginner
duration: 10
summary: Count how many rows a table has, how many match a condition, and how many different values a column holds.
objectives:
  - Count every row with COUNT(*)
  - Count only the rows that match a WHERE condition
  - Explain why COUNT(column) can be smaller than COUNT(*)
  - Count different values with COUNT(DISTINCT column)
---

So far, every query has returned rows from the table. Often you do not want the rows at all, just **how many** there are. That is what `COUNT` does.

## The big idea

Imagine the shop's books lined up on a shelf. Counting them means walking along the shelf and saying "one, two, three…". You end with **one number**, not a list of books.

`COUNT` does exactly that. It reads many rows and returns a single number. Functions that turn many rows into one value are called **aggregate functions**. `COUNT` is the first of five you will meet in this module.

## Syntax

```sql syntax
SELECT COUNT(*) FROM table_name;
SELECT COUNT(*) AS new_name FROM table_name WHERE condition;
SELECT COUNT(column_name) FROM table_name;
SELECT COUNT(DISTINCT column_name) FROM table_name;
```

- `COUNT(*)` counts **rows**. The `*` means "the whole row", so every row counts.
- `COUNT(column_name)` counts the rows where that column **has a value** (is not `NULL`).
- `COUNT(DISTINCT column_name)` counts how many **different** values the column holds.
- `AS new_name` names the result column, just as in the SQL fundamentals module.

## Examples

### Count every row

How many books does the shop have?

```sql
SELECT COUNT(*) FROM books;
```

Expected output:

| COUNT(*) |
| --- |
| 6 |

The result is a table with **one row and one column**. Without a name, SQLite labels the column with the expression you wrote, `COUNT(*)`.

### Give the count a name

Add `AS` so the result is easier to read:

```sql
SELECT COUNT(*) AS book_count FROM books;
```

| book_count |
| --- |
| 6 |

### Count only some rows

Put a `WHERE` condition in the query, and `COUNT` only sees the rows that are left. How many books cost less than 13?

```sql
SELECT COUNT(*) AS cheap_books FROM books WHERE price < 13;
```

| cheap_books |
| --- |
| 3 |

*The Silent Orchard* (12.99), *Counting Stars* (9.99) and *Paper Lanterns* (11.25) are counted.

### COUNT(column) skips missing values

In the `authors` table, Ana Ruiz's birth year is unknown, so her `born` value is `NULL`. **`NULL` means "no value"**: it is not zero and not empty text, just missing.

```sql
SELECT COUNT(*) AS all_authors, COUNT(born) AS known_birth_year FROM authors;
```

| all_authors | known_birth_year |
| --- | --- |
| 6 | 5 |

`COUNT(*)` counts all 6 authors. `COUNT(born)` counts only the 5 who have a birth year.

### Count different values with DISTINCT

Every book has a genre, so `COUNT(genre)` is 6. But how many **different** genres are there?

```sql
SELECT COUNT(genre) AS genres_listed, COUNT(DISTINCT genre) AS different_genres FROM books;
```

| genres_listed | different_genres |
| --- | --- |
| 6 | 4 |

The four different genres are Fantasy, Mystery, Science and Science fiction.

## How the query runs

For `SELECT COUNT(*) AS cheap_books FROM books WHERE price < 13;`:

1. `FROM books` reads all 6 rows.
2. `WHERE price < 13` keeps 3 of them.
3. `COUNT(*)` counts the rows that are left and **collapses them into one row** holding the number 3.

| id | price | price < 13 | Counted? |
| --- | --- | --- | --- |
| 1 | 12.99 | true | yes (1) |
| 2 | 15.50 | false | no |
| 3 | 9.99 | true | yes (2) |
| 4 | 18.00 | false | no |
| 5 | 11.25 | true | yes (3) |
| 6 | 14.75 | false | no |

The important part is the order: `WHERE` filters **first**, then `COUNT` counts what is left.

> If no rows match, `COUNT` returns `0`, never an empty result. For example, there are no Romance books, so `SELECT COUNT(*) FROM books WHERE genre = 'Romance';` returns one row with the value 0.

## Common mistakes

**Expecting COUNT(column) to count every row.** If the column has `NULL` values, those rows are skipped. In the `customers` table, Sofia Rossi has no city:

```sql
SELECT COUNT(*) AS customers, COUNT(city) AS with_city FROM customers;
```

| customers | with_city |
| --- | --- |
| 5 | 4 |

Use `COUNT(*)` when you want to count rows. Use `COUNT(column)` only when you mean "rows where this column has a value".

**Misspelling the function name.** The database only knows its own function names:

```sql error
SELECT COUNTS(*) FROM books;
```

SQLite answers with `no such function: COUNTS`.

**Forgetting the brackets.** Without them, SQL reads `COUNT` as a column name:

```sql error
SELECT COUNT FROM books;
```

SQLite answers with `no such column: COUNT`.

## Try it yourself

Try each task in the Practice space first, then compare with the answer.

**Task 1.** How many customers live in Bangalore? Name the column `bangalore_customers`.

```sql
SELECT COUNT(*) AS bangalore_customers FROM customers WHERE city = 'Bangalore';
```

| bangalore_customers |
| --- |
| 2 |

**Task 2.** How many different authors have books in the `books` table? Name the column `authors_in_stock`.

```sql
SELECT COUNT(DISTINCT author) AS authors_in_stock FROM books;
```

| authors_in_stock |
| --- |
| 5 |

Mira Das wrote two books, so there are 6 books but only 5 different authors.

**Task 3.** How many orders have the status `'delivered'`? Name the column `delivered`.

```sql
SELECT COUNT(*) AS delivered FROM orders WHERE status = 'delivered';
```

| delivered |
| --- |
| 3 |

## Key takeaways

- `COUNT` is an **aggregate function**: it turns many rows into one number.
- `COUNT(*)` counts rows; `COUNT(column)` counts rows where the column is not `NULL`.
- `COUNT(DISTINCT column)` counts different values.
- `WHERE` filters rows **before** they are counted.
- Name your counts with `AS` so results are easy to read.
