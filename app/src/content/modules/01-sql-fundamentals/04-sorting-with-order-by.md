---
id: sorting-with-order-by
title: Sorting data with ORDER BY
module: sql-fundamentals
order: 4
level: beginner
duration: 10
summary: Sort rows from lowest to highest or highest to lowest, by one column or several.
objectives:
  - Sort a result with ORDER BY
  - Reverse the order with DESC
  - Sort by more than one column
---

Without instructions, a database returns rows in whatever order is convenient for it, and that order is not guaranteed. `ORDER BY` sorts the result so the order is always the one you asked for.

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name ORDER BY column1 [ASC | DESC], column2 [ASC | DESC];
```

- `ASC` means ascending: smallest number, earliest date, or A first. It is the default, so you can leave it out.
- `DESC` means descending: largest, latest, or Z first.
- The square brackets mean the part is optional; do not type them.

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

Mira Das has two books, so her rows are ordered by `year`.

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

1. `FROM books` picks the table.
2. `WHERE` keeps the matching rows (if there is a `WHERE`).
3. `SELECT` keeps the listed columns.
4. `ORDER BY` sorts the remaining rows.

Sorting happens near the end, after filtering. That is why `ORDER BY` is written after `WHERE`: the clauses always appear in the order `SELECT`, `FROM`, `WHERE`, `ORDER BY`.

> If two rows have the same value in every column you sort by, their order is still not guaranteed. Add another column to `ORDER BY` whenever a fixed order matters.

## Common mistakes

**Putting ORDER BY before WHERE.** The clauses have a fixed order:

```sql error
SELECT title FROM books ORDER BY price WHERE genre = 'Fantasy';
```

This causes a syntax error. Write `WHERE` first, then `ORDER BY`.

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

**Relying on the default order.** A query without `ORDER BY` may return rows in the stored order today and in a different order after the table changes. If the order matters, always use `ORDER BY`.

## Key takeaways

- `ORDER BY` sorts the result; without it, row order is not guaranteed.
- Sorting is ascending by default; add `DESC` for highest first.
- Sort by several columns to break ties, in order of importance.
- `DESC` applies only to the column it follows.
- `ORDER BY` comes after `WHERE`.
