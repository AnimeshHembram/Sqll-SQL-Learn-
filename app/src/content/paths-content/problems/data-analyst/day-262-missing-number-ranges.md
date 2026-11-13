---
id: da-day-262
title: Missing invoice numbers as ranges
order: 262
difficulty: intermediate
topic: Gaps and islands
summary: Summarise gaps in a number sequence as from-to ranges instead of one row per missing number.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find gaps with LEAD
  - Summarise gaps as ranges
prerequisites:
  - Day 73
  - Day 65
---

## Task

Invoice numbers should run without gaps (starter query). Instead of listing every missing number, summarise each gap as a range: `missing_from`, `missing_to` and `count` (how many numbers are missing in it). Only gaps between the first and last invoice count.

Sort by `missing_from`.

## Starter query

```sql
WITH invoices(invoice_no) AS (
  VALUES (1001), (1002), (1003), (1006), (1007), (1008), (1009), (1013), (1015), (1016), (1020)
)
SELECT invoice_no
FROM invoices
ORDER BY invoice_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pair each invoice with the next one: `LEAD(invoice_no) OVER (ORDER BY invoice_no)`. A gap exists where the next number is more than one higher.
3. The gap runs from `invoice_no + 1` to `next_no - 1`, and its size is `next_no - invoice_no - 1`.

## Solution

```sql
WITH invoices(invoice_no) AS (
  VALUES (1001), (1002), (1003), (1006), (1007), (1008), (1009), (1013), (1015), (1016), (1020)
),
pairs AS (
  SELECT invoice_no, LEAD(invoice_no) OVER (ORDER BY invoice_no) AS next_no FROM invoices
)
SELECT invoice_no + 1 AS missing_from, next_no - 1 AS missing_to, next_no - invoice_no - 1 AS "count"
FROM pairs
WHERE next_no - invoice_no > 1
ORDER BY missing_from;
```

## Expected result

| missing_from | missing_to | count |
| --- | --- | --- |
| 1004 | 1005 | 2 |
| 1010 | 1012 | 3 |
| 1014 | 1014 | 1 |
| 1017 | 1019 | 3 |

## Explanation

Listing every missing number is long and hard to read; ranges say the same thing in four rows. `LEAD` pairs each invoice with the next one, and any step bigger than 1 is a gap from `invoice_no + 1` to `next_no − 1`. Nine numbers are missing in total, including the single number 1014.

Only gaps between existing invoices count; whether numbers before 1001 or after 1020 are "missing" is a different question, which the task deliberately leaves out. Auditors usually want ranges like these, because a run of three consecutive missing numbers (1010 to 1012) suggests one deleted batch rather than three unrelated errors.

**Common mistake:** reporting the neighbouring invoice numbers as the range. `1003 to 1006` includes two invoices that exist, and every count is one too high.

## Wrong answers

Feedback: incorrect-output

```sql
WITH invoices(invoice_no) AS ( VALUES (1001), (1002), (1003), (1006), (1007), (1008), (1009), (1013), (1015), (1016), (1020) ), pairs AS (SELECT invoice_no, LEAD(invoice_no) OVER (ORDER BY invoice_no) AS next_no FROM invoices) SELECT invoice_no AS missing_from, next_no AS missing_to, next_no - invoice_no AS "count" FROM pairs WHERE next_no - invoice_no > 1 ORDER BY missing_from;
```
