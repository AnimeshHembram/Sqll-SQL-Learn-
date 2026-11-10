---
id: da-day-073
title: Missing invoice numbers
order: 73
difficulty: advanced
topic: Data quality
summary: Generate a number sequence with a recursive CTE to find gaps.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Generate a sequence with a recursive CTE
  - Find gaps in a sequence
prerequisites:
  - Day 33
  - Day 26
---

## Task

Invoice numbers should run without gaps. Using the list of issued invoices in the starter query, return every **missing** number between the lowest and the highest as `missing_invoice`. Sort from lowest to highest.

## Starter query

```sql
WITH invoices(invoice_no) AS (
  VALUES (101), (102), (104), (105), (108), (109), (110)
)
SELECT invoice_no
FROM invoices
ORDER BY invoice_no;
```

## Hints

1. You cannot select numbers that are not in any table, so first generate every number from 101 to 110.
2. A recursive CTE starts from one row and adds rows to itself: `numbers(n) AS (SELECT 101 UNION ALL SELECT n + 1 FROM numbers WHERE n < 110)`. Start the query with `WITH RECURSIVE`.
3. Use `MIN(invoice_no)` and `MAX(invoice_no)` instead of 101 and 110, then keep numbers `NOT IN (SELECT invoice_no FROM invoices)`.

## Solution

```sql
WITH RECURSIVE invoices(invoice_no) AS (
  VALUES (101), (102), (104), (105), (108), (109), (110)
),
numbers(n) AS (
  SELECT MIN(invoice_no) FROM invoices
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < (SELECT MAX(invoice_no) FROM invoices)
)
SELECT n AS missing_invoice
FROM numbers
WHERE n NOT IN (SELECT invoice_no FROM invoices)
ORDER BY n;
```

## Expected result

| missing_invoice |
| --- |
| 103 |
| 106 |
| 107 |

## Explanation

The recursive part runs again and again, adding `n + 1`, until the condition stops it at 110. Comparing the full sequence with the issued numbers shows 103, 106 and 107 are missing. Using `MIN` and `MAX` makes the query work for any range.
