---
id: da-books-already-stocked
title: New books that are already in the catalogue
order: 3
difficulty: intermediate
topic: Duplicates
summary: Find batch rows that duplicate an existing book under a new id.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Find duplicates against existing data
---

## Task

Some "new" books in the batch (in the starter query) are books we already stock, sent again with a new id. A book is the same if the **title and author match, ignoring capital letters**. Return the batch `id`, the `title` and `existing_id` (the id in `books`). Row order does not matter.

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

1. Join the batch to `books` on the title and the author.
2. Compare text in lower case on both sides: `lower(b.title) = lower(n.title)`.
3. Return `n.id`, `n.title` and `b.id AS existing_id`.

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
SELECT n.id, n.title, b.id AS existing_id
FROM new_books AS n
JOIN books AS b ON lower(b.title) = lower(n.title) AND lower(b.author) = lower(n.author);
```

## Expected result

| id | title | existing_id |
| --- | --- | --- |
| 11 | Paper Lanterns | 5 |

## Explanation

*Paper Lanterns* by Ken Ito is already book 5. *The Quiet Ledger* is not a match: its title differs from *A Quiet Ledger* and it has a different year and price, so it may be a genuinely new book. Duplicate checks need a clear rule, and borderline cases are worth a human look rather than an automatic merge.

## Wrong answers

Feedback: extra-rows

```sql
WITH new_books(id, title, author, genre, year, price) AS ( VALUES (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50), (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25), (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00), (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00), (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25), (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50), (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL) ) SELECT n.id, n.title, b.id AS existing_id FROM new_books AS n JOIN books AS b ON lower(b.author) = lower(n.author);
```
