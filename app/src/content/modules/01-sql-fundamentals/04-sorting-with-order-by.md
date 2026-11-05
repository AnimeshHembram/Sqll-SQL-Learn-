---
id: sorting-with-order-by
title: Sorting data with ORDER BY
module: sql-fundamentals
order: 4
level: beginner
duration: 12
summary: Sort rows from lowest to highest or highest to lowest, by one column or several.
objectives:
  - Sort a result with ORDER BY
  - Reverse the order with DESC
  - Sort by more than one column to break ties
  - Explain why a query without ORDER BY has no guaranteed order
---

Without instructions, a database returns rows in whatever order is convenient for it, and that order can change. `ORDER BY` sorts the result, so you always get the order you asked for.

## The big idea

Think of the sort button on a column in a spreadsheet or an online shop: **"Price: low to high"**, **"Newest first"**. One click and the whole list is rearranged by that column.

`ORDER BY` is that button, written in SQL:

- **Ascending** (`ASC`) means low to high: smallest number, earliest date, A before Z. This is the default.
- **Descending** (`DESC`) means high to low: largest number, latest date, Z before A.

Sorting never adds or removes rows. It only changes their order.

## Sorting, step by step

**Step 1.** Write the query as usual: `SELECT title, year FROM books`

**Step 2.** Add `ORDER BY` and the column to sort by: `... ORDER BY year`

**Step 3.** For high to low, add `DESC` after that column: `... ORDER BY year DESC`

**Step 4.** If two rows have the same value, add a second column to decide between them: `... ORDER BY author, year`

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name ORDER BY column1 [ASC | DESC], column2 [ASC | DESC];
```

- `ASC` is the default, so you can leave it out.
- The square brackets mean the part is optional; do not type them.
- `ORDER BY` comes after `WHERE`.

## Examples

### Sort by one column

```sql
SELECT title, year FROM books ORDER BY year;
```

Expected output:

| title | year |
| --- | --- |
| Counting Stars | 2015 |
| The Silent Orchard | 2018 |
| Paper Lanterns | 2019 |
| A Quiet Ledger | 2020 |
| Rivers of Glass | 2021 |
| The Last Signal | 2023 |

The oldest book is first and the newest is last. The same 6 rows as always, just rearranged.

### Highest first with DESC

```sql
SELECT title, price FROM books ORDER BY price DESC;
```

| title | price |
| --- | --- |
| The Last Signal | 18.00 |
| Rivers of Glass | 15.50 |
| A Quiet Ledger | 14.75 |
| The Silent Orchard | 12.99 |
| Paper Lanterns | 11.25 |
| Counting Stars | 9.99 |

### Sort text alphabetically

Text is sorted A to Z:

```sql
SELECT title FROM books ORDER BY title;
```

| title |
| --- |
| A Quiet Ledger |
| Counting Stars |
| Paper Lanterns |
| Rivers of Glass |
| The Last Signal |
| The Silent Orchard |

### Sort by several columns

List more than one column to break ties. Rows are sorted by the first column; rows with the same value there are sorted by the next:

```sql
SELECT author, title, year FROM books ORDER BY author, year;
```

| author | title | year |
| --- | --- | --- |
| Ana Ruiz | A Quiet Ledger | 2020 |
| Ken Ito | Paper Lanterns | 2019 |
| Mira Das | The Silent Orchard | 2018 |
| Mira Das | The Last Signal | 2023 |
| Priya Nair | Counting Stars | 2015 |
| Tomas Varga | Rivers of Glass | 2021 |

Mira Das has two books, so the tie on `author` is broken by `year`: her 2018 book comes before her 2023 book.

### Filter, then sort

`WHERE` and `ORDER BY` work together:

```sql
SELECT title, price FROM books WHERE genre = 'Fantasy' ORDER BY price;
```

| title | price |
| --- | --- |
| Paper Lanterns | 11.25 |
| Rivers of Glass | 15.50 |

## How the query runs

For `SELECT title, price FROM books WHERE genre = 'Fantasy' ORDER BY price;`:

1. **`FROM books`** picks the table: 6 rows.
2. **`WHERE genre = 'Fantasy'`** keeps 2 rows.
3. **`SELECT title, price`** keeps 2 columns.
4. **`ORDER BY price`** sorts those 2 rows, cheapest first.

Sorting happens near the end, after filtering. That is why `ORDER BY` is written after `WHERE`: the clauses are always written in the order `SELECT`, `FROM`, `WHERE`, `ORDER BY`.

> If two rows have the same value in every column you sort by, their order is still not guaranteed. Add another column to `ORDER BY` whenever a fixed order matters.

## Common mistakes

**Putting ORDER BY before WHERE.** The clauses have a fixed order:

```sql error
SELECT title FROM books ORDER BY price WHERE genre = 'Fantasy';
```

This causes a syntax error. **Why it happens:** in English you might say "sort by price, only fantasy", but SQL needs to know which rows to keep before it sorts them. Write `WHERE` first, then `ORDER BY`.

**Expecting DESC to apply to every column.** `DESC` only affects the column directly before it. Here `genre` is still sorted A to Z, and only `price` is reversed within each genre:

```sql
SELECT genre, title, price FROM books ORDER BY genre, price DESC;
```

| genre | title | price |
| --- | --- | --- |
| Fantasy | Rivers of Glass | 15.50 |
| Fantasy | Paper Lanterns | 11.25 |
| Mystery | A Quiet Ledger | 14.75 |
| Mystery | The Silent Orchard | 12.99 |
| Science | Counting Stars | 9.99 |
| Science fiction | The Last Signal | 18.00 |

To reverse both, write `ORDER BY genre DESC, price DESC`.

**Relying on the default order.** A query without `ORDER BY` may return rows in the stored order today and a different order after the table changes. **Why it happens:** the database is free to read rows in whatever way is fastest. If the order matters, always say so with `ORDER BY`.

## Try it yourself

Open the Practice space and try each task first, then compare with the answer below it.

**Task 1.** Show each customer's name and the date they joined, newest member first.

```sql
SELECT name, joined FROM customers ORDER BY joined DESC;
```

| name | joined |
| --- | --- |
| Meera Pillai | 2025-06-30 |
| Daniel Kim | 2025-02-11 |
| Sofia Rossi | 2024-05-20 |
| Rahul Mehta | 2024-03-02 |
| Aisha Khan | 2024-01-15 |

Dates written as `YYYY-MM-DD` sort correctly, because the year comes first.

**Task 2.** Show the title, year and price of the books published in 2019 or later, cheapest first.

```sql
SELECT title, year, price FROM books WHERE year >= 2019 ORDER BY price;
```

| title | year | price |
| --- | --- | --- |
| Paper Lanterns | 2019 | 11.25 |
| A Quiet Ledger | 2020 | 14.75 |
| Rivers of Glass | 2021 | 15.50 |
| The Last Signal | 2023 | 18.00 |

**Task 3.** Show each customer's name and city, sorted by city. Where does the customer with no city appear?

```sql
SELECT name, city FROM customers ORDER BY city, name;
```

| name | city |
| --- | --- |
| Sofia Rossi | NULL |
| Aisha Khan | Bangalore |
| Daniel Kim | Bangalore |
| Meera Pillai | Chennai |
| Rahul Mehta | Mumbai |

SQLite puts `NULL` before every other value when sorting in ascending order. Adding `name` as a second column keeps the two Bangalore customers in a fixed order.

## Key takeaways

- `ORDER BY` sorts the result; without it, row order is not guaranteed.
- Sorting is ascending (low to high, A to Z) by default; add `DESC` for high to low.
- Sort by several columns to break ties, in order of importance.
- `DESC` applies only to the column it follows.
- `ORDER BY` comes after `WHERE`.
