---
id: da-impossible-book-values
title: Impossible prices and years
order: 2
difficulty: intermediate
topic: Validity
summary: Find rows with missing or impossible values before loading them.
module: data-analyst
duration: 7
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Check for missing and impossible values
---

## Task

In the same batch of new books (in the starter query), find the rows that cannot be right: a **missing** price, a price of **zero or less**, or a publication `year` **after 2025**. Return `id`, `title`, `year` and `price`. Row order does not matter.

**Steps**

1. Keep the `WITH new_books ...` block.
2. Write one condition per problem: `price IS NULL`, `price <= 0`, `year > 2025`.
3. Join the conditions with `OR`, because any one of them makes the row a problem.

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
SELECT id, title, year, price
FROM new_books;
```

## Hints

1. `price <= 0` alone does not find the missing price: a comparison with `NULL` is never true.
2. Put `price IS NULL` first, then the comparisons.
3. `WHERE price IS NULL OR price <= 0 OR year > 2025`

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
SELECT id, title, year, price
FROM new_books
WHERE price IS NULL OR price <= 0 OR year > 2025;
```

## Expected result

| id | title | year | price |
| --- | --- | --- | --- |
| 9 | Northern Lights Again | 2025 | -4 |
| 10 | Signal Lost | 2031 | 16 |
| 13 | Tidewater | 2023 | NULL |

## Explanation

Three rows fail: a negative price (row 9), a year in the future (row 10) and a missing price (row 13). Without `price IS NULL`, row 13 would slip through, because `NULL <= 0` is not true.

## Wrong answers

Feedback: missing-rows

```sql
WITH new_books(id, title, author, genre, year, price) AS ( VALUES (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50), (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25), (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00), (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00), (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25), (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50), (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL) ) SELECT id, title, year, price FROM new_books WHERE price <= 0 OR year > 2025;
```
