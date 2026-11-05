---
id: what-is-sql
title: What is SQL?
module: sql-fundamentals
order: 1
level: beginner
duration: 10
summary: Meet databases, tables, rows and columns, and read your first query.
objectives:
  - Describe a table in terms of rows and columns
  - Explain what a SQL query is and what it returns
  - Read and write the simplest SELECT statement
  - Recognise the two most common beginner errors
---

Almost every app you use, from online shops to banking apps, keeps its information in a **database**. SQL is the language people use to ask a database questions. In this lesson you will see what a database table looks like and ask it your first question.

## The big idea

Think of a bookshop that keeps a list of its books in a spreadsheet:

- Each **row** of the spreadsheet is one book.
- Each **column** is one piece of information about the books: the title, the author, the price.
- The column headings tell you what each column means.

A database stores information in exactly this shape. Each sheet is called a **table**. A database can hold many tables: one for books, one for customers, one for orders.

You do not click around a database the way you scroll a spreadsheet. Instead, you **ask it a question in SQL**, and it **answers with a new table**.

## Rows, columns and tables, step by step

**Step 1: the table.** This module uses a table called `books`. Every table has a name, and you use that name to tell the database which table you mean.

**Step 2: the columns.** The `books` table has 6 columns:

| Column | What it holds | Example |
| --- | --- | --- |
| `id` | A unique number for each book | 3 |
| `title` | The book's title | Counting Stars |
| `author` | Who wrote it | Priya Nair |
| `genre` | What kind of book it is | Science |
| `year` | The year it was published | 2015 |
| `price` | What it costs | 9.99 |

**Step 3: the rows.** The table has 6 rows, one per book. The `id` column gives every book its own number, so even two books with the same title could be told apart.

**Step 4: the question.** A request written in SQL is called a **query**. SQL stands for *Structured Query Language*. The database reads your query and sends back a **result**, which is always a table too.

## Syntax

The simplest useful query asks for everything in a table:

```sql syntax
SELECT * FROM table_name;
```

Read it word by word:

- `SELECT` means "show me".
- `*` (a star) means "every column".
- `FROM table_name` says which table to look in. Replace `table_name` with a real table name, such as `books`.
- The semicolon `;` marks the end of the query, like a full stop at the end of a sentence.

`SELECT` and `FROM` are **keywords**: words that have a fixed meaning in SQL.

## Examples

### See the whole books table

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

How to read this result:

- The **header row** shows the 6 column names.
- Each **row below it is one book**. Row 4, for example, says that *The Last Signal* is a science fiction book by Mira Das, published in 2023, costing 18.00.
- Mira Das appears twice because she wrote two of the books.

This is the table you will work with in every lesson of this module, so it is worth a careful look.

### Look at a different table

The bookstore database has other tables too. Change the table name and you see a different table:

```sql
SELECT * FROM authors;
```

| name | country | born |
| --- | --- | --- |
| Mira Das | India | 1980 |
| Tomas Varga | Hungary | 1975 |
| Priya Nair | India | 1990 |
| Ken Ito | Japan | 1968 |
| Ana Ruiz | Spain | NULL |
| Leo Brandt | Germany | 1985 |

Notice Ana Ruiz's `born` value: `NULL`. **`NULL` means "no value"**: her birth year is unknown. It is not zero and not empty text, just missing. You will meet `NULL` again in later lessons.

## How the query runs

When you run `SELECT * FROM books;`:

1. **`FROM books`**: the database finds the table called `books`.
2. **`SELECT *`**: it takes every column of every row.
3. It sends back the result as a new table.

Notice that the database reads `FROM` *before* `SELECT`, even though you write `SELECT` first. It has to know which table to use before it can pick anything from it. You will see this "written order versus running order" again in every lesson.

> A `SELECT` query only **reads** data. Running it never changes the `books` table, so you can run it as many times as you like without breaking anything.

> SQL keywords are not case-sensitive: `select * from books;` works too. Writing keywords in CAPITALS is a common habit because it makes them easy to tell apart from table and column names.

## Common mistakes

**Misspelling the table name.** The database only knows the tables that really exist. Here `book` is missing its final `s`:

```sql error
SELECT * FROM book;
```

SQLite answers with the error `no such table: book`. **Why it happens:** table names are easy to guess wrong (singular or plural?). When you see `no such table`, compare your spelling with the real table name.

**Leaving out FROM.** Without `FROM`, the database cannot tell that `books` is a table:

```sql error
SELECT * books;
```

This causes a **syntax error**: SQL's way of saying "I cannot understand the grammar of this sentence". **Why it happens:** in everyday English "show me everything books" almost makes sense, but SQL needs the exact keyword. A query that reads a table always needs both `SELECT` and `FROM`.

## Try it yourself

Open the Practice space and try each task first, then compare with the answer below it.

**Task 1.** Show every column and every row of the `customers` table. How many customers are there, and which one has no city?

```sql
SELECT * FROM customers;
```

| id | name | city | joined |
| --- | --- | --- | --- |
| 1 | Aisha Khan | Bangalore | 2024-01-15 |
| 2 | Rahul Mehta | Mumbai | 2024-03-02 |
| 3 | Sofia Rossi | NULL | 2024-05-20 |
| 4 | Daniel Kim | Bangalore | 2025-02-11 |
| 5 | Meera Pillai | Chennai | 2025-06-30 |

There are 5 customers, and Sofia Rossi's city is `NULL` (unknown).

**Task 2.** Show the whole `orders` table. What is the status of order 4?

```sql
SELECT * FROM orders;
```

| id | customer_id | order_date | status |
| --- | --- | --- | --- |
| 1 | 1 | 2025-01-10 | delivered |
| 2 | 2 | 2025-01-18 | delivered |
| 3 | 1 | 2025-02-05 | shipped |
| 4 | 3 | 2025-02-14 | cancelled |
| 5 | 4 | 2025-03-01 | delivered |
| 6 | 2 | 2025-03-09 | shipped |

Order 4 was cancelled. The `customer_id` column holds the `id` of the customer who placed the order, so order 4 belongs to customer 3, Sofia Rossi.

## Key takeaways

- A database stores data in **tables**; each **row** is one record and each **column** is one piece of information.
- A SQL **query** asks a question, and the answer is a new table called the **result**.
- `SELECT * FROM table_name;` returns every column and every row of a table.
- The database reads `FROM` before `SELECT`.
- `NULL` means a value is missing.
- `SELECT` only reads data; it never changes the table.
