---
id: sum-avg-min-max
title: Totals and averages with SUM, AVG, MIN and MAX
module: summarising-data
order: 2
level: beginner
duration: 12
summary: Add up a column, find its average, and pick out its smallest and largest values.
objectives:
  - Add up the values in a column with SUM
  - Calculate an average with AVG and round it with ROUND
  - Find the smallest and largest value with MIN and MAX
  - Calculate several summaries in one query
---

`COUNT` answers "how many?". The other four aggregate functions answer "how much?": the **total**, the **average**, the **smallest** and the **largest** value in a column.

## The big idea

Think of a shopping receipt. At the bottom it shows a **total**. You could also work out the **average** item price, or spot the **cheapest** and **most expensive** item. Each answer looks at every line of the receipt and gives back **one number**.

| Function | Question it answers | Works on |
| --- | --- | --- |
| `SUM(column)` | What is the total? | numbers |
| `AVG(column)` | What is the average? | numbers |
| `MIN(column)` | What is the smallest value? | numbers, text, dates |
| `MAX(column)` | What is the largest value? | numbers, text, dates |

Like `COUNT(column)`, all four **ignore `NULL` values**.

## Syntax

```sql syntax
SELECT SUM(column_name) AS total FROM table_name;
SELECT ROUND(AVG(column_name), 2) AS average FROM table_name;
SELECT MIN(column_name) AS smallest, MAX(column_name) AS largest FROM table_name;
```

- Put the column to summarise inside the brackets.
- `ROUND(value, 2)` rounds a number to 2 decimal places. It is not an aggregate; it just tidies a number.
- You can list several aggregates after `SELECT`, separated by commas, and get them all in one row.

## Examples

### Add up a column with SUM

What would it cost to buy one copy of every book?

```sql
SELECT SUM(price) AS total_price FROM books;
```

Expected output:

| total_price |
| --- |
| 82.48 |

SQLite adds 12.99 + 15.50 + 9.99 + 18.00 + 11.25 + 14.75.

### Find the average with AVG

```sql
SELECT AVG(price) AS average_price FROM books;
```

| average_price |
| --- |
| 13.746666666666668 |

The average is the total divided by the number of values: 82.48 ÷ 6. That long number is hard to read, so round it:

```sql
SELECT ROUND(AVG(price), 2) AS average_price FROM books;
```

| average_price |
| --- |
| 13.75 |

### Smallest and largest with MIN and MAX

```sql
SELECT MIN(price) AS cheapest, MAX(price) AS most_expensive FROM books;
```

| cheapest | most_expensive |
| --- | --- |
| 9.99 | 18.00 |

`MIN` and `MAX` also work on years:

```sql
SELECT MIN(year) AS oldest, MAX(year) AS newest FROM books;
```

| oldest | newest |
| --- | --- |
| 2015 | 2023 |

On text, `MIN` and `MAX` use alphabetical order, so `MIN(title)` is the title that comes first from A to Z:

```sql
SELECT MIN(title) AS first_title, MAX(title) AS last_title FROM books;
```

| first_title | last_title |
| --- | --- |
| A Quiet Ledger | The Silent Orchard |

### Summarise only some rows

Add `WHERE` to summarise part of the table. Here is a summary of Fantasy books only:

```sql
SELECT COUNT(*) AS fantasy_books, ROUND(AVG(price), 2) AS average_price FROM books WHERE genre = 'Fantasy';
```

| fantasy_books | average_price |
| --- | --- |
| 2 | 13.38 |

### Summarise a calculation

The value inside the brackets can be a calculation. Each row of `order_items` holds a `quantity` and the `unit_price` paid. Multiply them and add up the results to get the shop's total sales:

```sql
SELECT ROUND(SUM(quantity * unit_price), 2) AS revenue FROM order_items;
```

| revenue |
| --- |
| 146.45 |

## How the query runs

For `SELECT MIN(price) AS cheapest, MAX(price) AS most_expensive FROM books;`:

1. `FROM books` reads all 6 rows.
2. There is no `WHERE`, so every row is kept.
3. `MIN(price)` and `MAX(price)` each look at all 6 prices.
4. The 6 rows **collapse into one row** holding both answers.

| price | Smallest so far | Largest so far |
| --- | --- | --- |
| 12.99 | 12.99 | 12.99 |
| 15.50 | 12.99 | 15.50 |
| 9.99 | 9.99 | 15.50 |
| 18.00 | 9.99 | 18.00 |
| 11.25 | 9.99 | 18.00 |
| 14.75 | 9.99 | 18.00 |

> `AVG` divides by the number of values that are **not `NULL`**. In the `authors` table, one birth year is missing, so `AVG(born)` adds up 5 years and divides by 5, not 6.

## Common mistakes

**Showing an ordinary column next to an aggregate.** This query looks like it asks "which book is the most expensive?":

```sql
SELECT title, MAX(price) AS top_price FROM books;
```

| title | top_price |
| --- | --- |
| The Last Signal | 18.00 |

SQLite happens to show the matching title here, but this is a SQLite shortcut. Most other databases (PostgreSQL, SQL Server, and MySQL in its default mode) reject this query with an error. To find the most expensive book, sort and limit instead:

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 1;
```

| title | price |
| --- | --- |
| The Last Signal | 18.00 |

**Using an aggregate in WHERE.** `WHERE` checks one row at a time, before any totals exist, so it cannot use `SUM`, `AVG`, `MIN`, `MAX` or `COUNT`:

```sql error
SELECT title FROM books WHERE price > AVG(price);
```

SQLite answers with `misuse of aggregate function AVG()`. You will learn how to compare against an average in a later module (subqueries).

**Expecting 0 when nothing matches.** `COUNT` returns 0 for no rows, but `SUM`, `AVG`, `MIN` and `MAX` return `NULL`, because there is nothing to add up:

```sql
SELECT SUM(price) AS total FROM books WHERE genre = 'Romance';
```

| total |
| --- |
| NULL |

## Try it yourself

Try each task in the Practice space first, then compare with the answer.

**Task 1.** How many copies were sold in total? Add up the `quantity` column of `order_items` and name the result `copies_sold`.

```sql
SELECT SUM(quantity) AS copies_sold FROM order_items;
```

| copies_sold |
| --- |
| 11 |

**Task 2.** For the books by Mira Das, return the year of her first book (`first_year`), the year of her latest book (`last_year`) and how many books she has (`books`).

```sql
SELECT MIN(year) AS first_year, MAX(year) AS last_year, COUNT(*) AS books FROM books WHERE author = 'Mira Das';
```

| first_year | last_year | books |
| --- | --- | --- |
| 2018 | 2023 | 2 |

**Task 3.** What is the difference between the most expensive and the cheapest book? Name it `price_range`. *Hint: you can subtract one aggregate from another.*

```sql
SELECT MAX(price) - MIN(price) AS price_range FROM books;
```

| price_range |
| --- |
| 8.01 |

## Key takeaways

- `SUM` adds up, `AVG` averages, `MIN` and `MAX` find the smallest and largest value.
- Each aggregate turns many rows into **one value**; several aggregates in one query give one row.
- `MIN` and `MAX` also work on text (alphabetical order) and dates.
- Aggregates ignore `NULL`. With no rows at all, `COUNT` gives 0 and the others give `NULL`.
- Use `ROUND(value, 2)` to make averages readable.
- Aggregates cannot go in `WHERE`.
