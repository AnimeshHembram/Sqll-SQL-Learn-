---
id: da-day-142
title: Validate an import row by row
order: 142
difficulty: intermediate
topic: Data quality
summary: Check types and formats with typeof, GLOB and text functions, and list every problem per row.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Check value types with typeof
  - Validate formats with GLOB and string functions
prerequisites:
  - Day 86
  - Day 118
---

## Task

An order import (in the starter query) mixes types: some quantities are numbers, some are text. Check each row against three rules and report every rule it breaks:

- **bad sku**: the SKU must be `BK-` followed by exactly four digits (capital letters).
- **bad qty**: the quantity must be a whole number above 0, stored either as an integer or as text made only of digits (so `'4'` and `'07'` are fine; `'two'`, `2.5`, `-1` and `NULL` are not).
- **bad email**: the email must exist, contain exactly one `@`, and have at least one character before it and a `.` somewhere after it.

Return only rows with problems: `row_id` and `problems`, the broken rules in the order above joined with `'; '`. Sort by `row_id`.

## Starter query

```sql
WITH raw_orders(row_id, sku, qty, email) AS (
  VALUES
    (1, 'BK-1001', 3, 'asha@example.com'),
    (2, 'BK-1002', '4', 'ravi@example.in'),
    (3, 'bk-1003', 2, 'mina@example.com'),
    (4, 'BK-104', 'two', 'tom@example'),
    (5, 'BK-1005', 2.5, 'lee@example.com'),
    (6, 'BK-1006', -1, 'kai@@example.com'),
    (7, 'BK-1007', NULL, NULL),
    (8, 'BK-1008', '07', 'zoe@example.com')
)
SELECT row_id, sku, qty, typeof(qty) AS qty_type, email
FROM raw_orders;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The starter query shows `typeof(qty)`: integer, real, text or null.
2. SKU: `sku GLOB 'BK-[0-9][0-9][0-9][0-9]'` (`GLOB` is case-sensitive). Quantity: `(typeof(qty) = 'integer' AND qty > 0) OR (typeof(qty) = 'text' AND qty <> '' AND qty NOT GLOB '*[^0-9]*' AND CAST(qty AS INTEGER) > 0)`. Email: `email LIKE '_%@%.%'` and one `@`: `length(email) - length(replace(email, '@', '')) = 1`.
3. Build the text from pieces that start with `'; '` and drop the first two characters: `substr(CASE ... THEN '; bad sku' ELSE '' END || ..., 3)`. A `NULL` email must count as bad, so test `email IS NULL OR NOT (...)`.

## Solution

```sql
WITH raw_orders(row_id, sku, qty, email) AS (
  VALUES
    (1, 'BK-1001', 3, 'asha@example.com'),
    (2, 'BK-1002', '4', 'ravi@example.in'),
    (3, 'bk-1003', 2, 'mina@example.com'),
    (4, 'BK-104', 'two', 'tom@example'),
    (5, 'BK-1005', 2.5, 'lee@example.com'),
    (6, 'BK-1006', -1, 'kai@@example.com'),
    (7, 'BK-1007', NULL, NULL),
    (8, 'BK-1008', '07', 'zoe@example.com')
),
checked AS (
  SELECT row_id,
    CASE WHEN sku GLOB 'BK-[0-9][0-9][0-9][0-9]' THEN 0 ELSE 1 END AS bad_sku,
    CASE
      WHEN typeof(qty) = 'integer' AND qty > 0 THEN 0
      WHEN typeof(qty) = 'text' AND qty <> '' AND qty NOT GLOB '*[^0-9]*' AND CAST(qty AS INTEGER) > 0 THEN 0
      ELSE 1
    END AS bad_qty,
    CASE
      WHEN email IS NULL THEN 1
      WHEN email LIKE '_%@%.%' AND length(email) - length(replace(email, '@', '')) = 1 THEN 0
      ELSE 1
    END AS bad_email
  FROM raw_orders
),
described AS (
  SELECT row_id,
    substr(
      CASE WHEN bad_sku = 1 THEN '; bad sku' ELSE '' END ||
      CASE WHEN bad_qty = 1 THEN '; bad qty' ELSE '' END ||
      CASE WHEN bad_email = 1 THEN '; bad email' ELSE '' END,
      3) AS problems
  FROM checked
)
SELECT row_id, problems
FROM described
WHERE problems <> ''
ORDER BY row_id;
```

## Expected result

| row_id | problems |
| --- | --- |
| 3 | bad sku |
| 4 | bad sku; bad qty; bad email |
| 5 | bad qty |
| 6 | bad qty; bad email |
| 7 | bad qty; bad email |

## Explanation

SQLite stores each value with its own type, so a "quantity" column can hold `3`, `'4'` and `2.5` side by side. `typeof` shows which, and the checks can then treat digit-only text as valid while rejecting decimals, negatives and words. `GLOB` matches simple patterns: `[0-9]` is one digit, and `'*[^0-9]*'` matches any text containing a character that is not a digit.

Row 6's email has two `@` signs; the simple `LIKE` pattern alone would accept it, which is why the `@` count is checked too. Row 7 shows that `NULL` needs explicit handling: `NULL LIKE ...` is `NULL`, not false.

Real email validation is more complex; these checks catch the common import errors without pretending to be complete.

**Common mistake:** testing quantities with `CAST(qty AS INTEGER) > 0` alone. `CAST(2.5 AS INTEGER)` is 2, so row 5's decimal quantity slips through.

## Wrong answers

Feedback: missing-rows

```sql
WITH raw_orders(row_id, sku, qty, email) AS ( VALUES (1, 'BK-1001', 3, 'asha@example.com'), (2, 'BK-1002', '4', 'ravi@example.in'), (3, 'bk-1003', 2, 'mina@example.com'), (4, 'BK-104', 'two', 'tom@example'), (5, 'BK-1005', 2.5, 'lee@example.com'), (6, 'BK-1006', -1, 'kai@@example.com'), (7, 'BK-1007', NULL, NULL), (8, 'BK-1008', '07', 'zoe@example.com') ), checked AS (SELECT row_id, CASE WHEN sku GLOB 'BK-[0-9][0-9][0-9][0-9]' THEN 0 ELSE 1 END AS bad_sku, CASE WHEN CAST(qty AS INTEGER) > 0 THEN 0 ELSE 1 END AS bad_qty, CASE WHEN email IS NULL THEN 1 WHEN email LIKE '_%@%.%' AND length(email) - length(replace(email, '@', '')) = 1 THEN 0 ELSE 1 END AS bad_email FROM raw_orders), described AS (SELECT row_id, substr(CASE WHEN bad_sku = 1 THEN '; bad sku' ELSE '' END || CASE WHEN bad_qty = 1 THEN '; bad qty' ELSE '' END || CASE WHEN bad_email = 1 THEN '; bad email' ELSE '' END, 3) AS problems FROM checked) SELECT row_id, problems FROM described WHERE problems <> '' ORDER BY row_id;
```
