---
id: what-is-sql
title: What is SQL?
module: sql-fundamentals
order: 1
level: beginner
duration: 8
summary: Meet databases, tables, rows and columns, and read your first query.
objectives:
  - Describe a table in terms of rows and columns
  - Explain what a SQL query is and what it returns
  - Read and write the simplest SELECT statement
---

## Data lives in tables

A **database** is an organised collection of data. In a *relational* database, such as SQLite, MySQL or PostgreSQL, data is stored in **tables**.

A table looks a lot like a spreadsheet:

- Each **column** holds one kind of information, such as a title or a price. Every column has a name.
- Each **row** is one record. In a table of books, each row is one book.

This module uses a table called `books`. It has 6 rows and 6 columns: `id`, `title`, `author`, `genre`, `year` and `price`. The `id` column gives every book a unique number, so two books with the same title could still be told apart.

## SQL asks questions

**SQL** (Structured Query Language) is the language used to work with relational databases. A request written in SQL is called a **query**. The database reads the query and answers with a new table, called the **result**.

The simplest useful query asks for everything in a table.

## Syntax

```sql syntax
SELECT * FROM table_name;
```

- `SELECT` and `FROM` are **keywords**: words with a fixed meaning in SQL.
- `*` means "every column".
- `table_name` is replaced by the name of a real table.
- The semicolon `;` marks the end of the statement.

## Example

To see the whole `books` table:

```sql
SELECT * FROM books;
```

Expected output:

| id | title | author | genre | year | price |
| --- | --- | --- | --- | --- | --- |
| 1 | The Silent Orchard | Mira Das | Mystery | 2018 | 12.99 |
| 2 | Rivers of Glass | Tomas Varga | Fantasy | 2021 | 15.50 |
| 3 | Counting Stars | Priya Nair | Science | 2015 | 9.99 |
| 4 | The Last Signal | Mira Das | Science fiction | 2023 | 18.00 |
| 5 | Paper Lanterns | Ken Ito | Fantasy | 2019 | 11.25 |
| 6 | A Quiet Ledger | Ana Ruiz | Mystery | 2020 | 14.75 |

This is the table you will work with in every lesson of this module.

## How the query runs

1. `FROM books` tells the database which table to read.
2. `SELECT *` keeps every column of every row.
3. The database sends back the result as a new table.

A `SELECT` query only **reads** data. Running it does not change the `books` table in any way, so you can run it as often as you like.

> SQL keywords are not case-sensitive: `select * from books;` works too. Writing keywords in capitals is a common convention because it makes them easy to tell apart from table and column names.

## Common mistakes

**Misspelling the table name.** The database only knows the tables that exist. Here `book` is missing its final `s`:

```sql error
SELECT * FROM book;
```

SQLite answers with the error `no such table: book`. Check the spelling against the real table name.

**Leaving out `FROM`.** Without `FROM`, the database cannot tell that `books` is a table:

```sql error
SELECT * books;
```

This causes a syntax error. A query that reads a table needs both `SELECT` and `FROM`.

## Key takeaways

- Relational databases store data in tables made of rows and columns.
- A SQL query asks a question, and the answer is a new table called the result.
- `SELECT * FROM table_name;` returns every column and every row of a table.
- `SELECT` only reads data; it never changes the table.
