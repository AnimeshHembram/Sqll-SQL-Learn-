---
id: da-batch-health-report
title: A one-row health report for the batch
order: 4
difficulty: advanced
topic: Check summary
summary: Combine several checks into counts of failed and clean rows.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - authors
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Combine checks into a summary
---

## Task

Summarise the batch (in the starter query) for the loading team. A row **fails** if any of these is true: its price is missing or zero or less, its year is after 2025, its author is not in `authors`, or a book with the same title and author (ignoring capitals) is already in `books`. Return one row with `total_rows`, `failed_rows` and `clean_rows`.

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
SELECT *
FROM new_books;
```

## Hints

1. Mark every row with a `failed` flag in a second CTE: 1 if any check fails, otherwise 0.
2. Use `NOT EXISTS (SELECT 1 FROM authors AS a WHERE a.name = n.author)` and `EXISTS (SELECT 1 FROM books AS b WHERE lower(b.title) = lower(n.title) AND lower(b.author) = lower(n.author))` inside a `CASE`.
3. Count all rows, sum the flags, and subtract for the clean rows.

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
),
flagged AS (
  SELECT n.id,
    CASE WHEN n.price IS NULL OR n.price <= 0 OR n.year > 2025
           OR NOT EXISTS (SELECT 1 FROM authors AS a WHERE a.name = n.author)
           OR EXISTS (SELECT 1 FROM books AS b WHERE lower(b.title) = lower(n.title) AND lower(b.author) = lower(n.author))
         THEN 1 ELSE 0 END AS failed
  FROM new_books AS n
)
SELECT COUNT(*) AS total_rows, SUM(failed) AS failed_rows, COUNT(*) - SUM(failed) AS clean_rows
FROM flagged;
```

## Expected result

| total_rows | failed_rows | clean_rows |
| --- | --- | --- |
| 7 | 5 | 2 |

## Explanation

Five of the seven rows fail at least one check; only rows 7 and 8 are ready to load. Counting rows that fail *any* check is not the same as adding up the failures per check: a row with two problems must still count once.

## Wrong answers

Feedback: incorrect-output

```sql
WITH new_books(id, title, author, genre, year, price) AS ( VALUES (7, 'Salt and Stone', 'Ken Ito', 'Fantasy', 2024, 13.50), (8, 'The Quiet Ledger', 'Ana Ruiz', 'Mystery', 2024, 14.25), (9, 'Northern Lights Again', 'Leo Brandt', 'Fantasy', 2025, -4.00), (10, 'Signal Lost', 'Mira Das', 'Science fiction', 2031, 16.00), (11, 'Paper Lanterns', 'Ken Ito', 'Fantasy', 2019, 11.25), (12, 'Field Notes', 'Hana Sato', 'Science', 2022, 10.50), (13, 'Tidewater', 'Tomas Varga', 'Fantasy', 2023, NULL) ) SELECT COUNT(*) AS total_rows, SUM(CASE WHEN price <= 0 OR year > 2025 THEN 1 ELSE 0 END) AS failed_rows, COUNT(*) - SUM(CASE WHEN price <= 0 OR year > 2025 THEN 1 ELSE 0 END) AS clean_rows FROM new_books;
```
