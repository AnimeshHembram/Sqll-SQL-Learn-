---
id: da-unknown-authors
title: New books by unknown authors
order: 1
difficulty: intermediate
topic: Referential integrity
summary: Find rows in a batch whose author is missing from the authors table.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Find references that point to nothing
---

## Task

A batch of new books (in the starter query) is waiting to be loaded. Every book's `author` must match a `name` in `authors`. Return the `id`, `title` and `author` of each new book whose author is **not** in `authors`. Row order does not matter.

**Steps**

1. Keep the `WITH new_books ...` block and replace the final `SELECT`.
2. `LEFT JOIN authors AS a ON a.name = n.author` keeps every new book; books with an unknown author get `NULL` in the `a` columns.
3. Keep the rows `WHERE a.name IS NULL`.

## Starter query

```sql
WITH new_books(id, title, author, genre, year, price) AS (
  VALUES
    (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50),
    (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25),
    (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00),
    (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00),
    (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25),
    (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50),
    (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL)
)
SELECT id, title, author
FROM new_books;
```

## Hints

1. A plain `JOIN` would drop exactly the rows you are looking for.
2. After a `LEFT JOIN`, test a column of the right-hand table for `NULL`.
3. `SELECT n.id, n.title, n.author FROM new_books AS n LEFT JOIN authors AS a ON a.name = n.author WHERE a.name IS NULL`

## Solution

```sql
WITH new_books(id, title, author, genre, year, price) AS (
  VALUES
    (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50),
    (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25),
    (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00),
    (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00),
    (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25),
    (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50),
    (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL)
)
SELECT n.id, n.title, n.author
FROM new_books AS n
LEFT JOIN authors AS a ON a.name = n.author
WHERE a.name IS NULL;
```

## Expected result

| id | title | author |
| --- | --- | --- |
| 12 | Field Notes | Hana Sato |

## Explanation

Only *Field Notes* by Hana Sato has no author record. Loading it as it is would create a book that disappears from every report joining books to authors. Either the author is added first, or the name is a typo of an existing author.

## Other accepted answers

```sql
WITH new_books(id, title, author, genre, year, price) AS ( VALUES (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50), (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25), (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00), (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00), (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25), (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50), (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL) ) SELECT id, title, author FROM new_books WHERE author NOT IN (SELECT name FROM authors);
```

## Wrong answers

Feedback: extra-rows

```sql
WITH new_books(id, title, author, genre, year, price) AS ( VALUES (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50), (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25), (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00), (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00), (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25), (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50), (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL) ) SELECT n.id, n.title, n.author FROM new_books AS n LEFT JOIN authors AS a ON a.name = n.author;
```
