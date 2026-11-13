---
id: da-day-324
title: Overdue library loans and fines
order: 324
difficulty: intermediate
topic: Education analytics
summary: Compute days overdue for returned and still-open loans and the fines owed, capped per loan.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure lateness against a report date
  - Cap a charge per item
prerequisites:
  - Day 133
  - Day 283
---

## Task

A library charges **₹5 per day** for each day a book is returned after its due date, capped at **₹100 per loan**. Loans not yet returned are overdue until the report date, **2025-03-31**. For every loan that is or was overdue, return `loan_id`, `member`, `due_on`, `returned_on`, `days_overdue`, `fine` and `state` (`'returned late'` or `'still out'`). Then add a final row `member` = `'Total'` with total fines in `fine` (other columns `NULL`). Sort by `loan_id`, with the total last.

## Starter query

```sql
WITH loans(loan_id, member, borrowed_on, due_on, returned_on) AS (
  VALUES
    (1, 'Asha', '2025-02-01', '2025-02-15', '2025-02-14'), (2, 'Asha', '2025-02-20', '2025-03-06', '2025-03-10'),
    (3, 'Ravi', '2025-02-05', '2025-02-19', '2025-03-15'), (4, 'Meera', '2025-03-01', '2025-03-15', NULL),
    (5, 'Kiran', '2025-03-10', '2025-03-24', NULL), (6, 'Ravi', '2025-03-02', '2025-03-16', '2025-03-16')
)
SELECT loan_id, member, due_on, returned_on
FROM loans
ORDER BY loan_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Days overdue: `julianday(COALESCE(returned_on, '2025-03-31')) - julianday(due_on)`; keep loans where it is above 0. Returning on the due date is on time.
3. Fine: `MIN(days * 5, 100)`. Add the total with `UNION ALL`, wrapping the union in a subquery to sort.

## Solution

```sql
WITH loans(loan_id, member, borrowed_on, due_on, returned_on) AS (
  VALUES
    (1, 'Asha', '2025-02-01', '2025-02-15', '2025-02-14'), (2, 'Asha', '2025-02-20', '2025-03-06', '2025-03-10'),
    (3, 'Ravi', '2025-02-05', '2025-02-19', '2025-03-15'), (4, 'Meera', '2025-03-01', '2025-03-15', NULL),
    (5, 'Kiran', '2025-03-10', '2025-03-24', NULL), (6, 'Ravi', '2025-03-02', '2025-03-16', '2025-03-16')
),
overdue AS (
  SELECT loan_id, member, due_on, returned_on,
    CAST(julianday(COALESCE(returned_on, '2025-03-31')) - julianday(due_on) AS INTEGER) AS days_overdue
  FROM loans
),
fines AS (
  SELECT loan_id, member, due_on, returned_on, days_overdue, MIN(days_overdue * 5, 100) AS fine,
    CASE WHEN returned_on IS NULL THEN 'still out' ELSE 'returned late' END AS state
  FROM overdue
  WHERE days_overdue > 0
)
SELECT * FROM (
  SELECT loan_id, member, due_on, returned_on, days_overdue, fine, state FROM fines
  UNION ALL
  SELECT NULL, 'Total', NULL, NULL, NULL, SUM(fine), NULL FROM fines
)
ORDER BY loan_id IS NULL, loan_id;
```

## Expected result

| loan_id | member | due_on | returned_on | days_overdue | fine | state |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | Asha | 2025-03-06 | 2025-03-10 | 4 | 20 | returned late |
| 3 | Ravi | 2025-02-19 | 2025-03-15 | 24 | 100 | returned late |
| 4 | Meera | 2025-03-15 | NULL | 16 | 80 | still out |
| 5 | Kiran | 2025-03-24 | NULL | 7 | 35 | still out |
| NULL | Total | NULL | NULL | NULL | 235 | NULL |

## Explanation

Overdue days are measured to the return date, or to the report date for books still out. `COALESCE(returned_on, '2025-03-31')` does both in one expression; returning a book on its due date (loan 6) is 0 days late and not fined.

Ravi's book was 24 days late, which would be 120 rupees, but the fine is capped at 100. Meera and Kiran still have their books, so their fines keep growing until they return them; the report shows what they owe today. Total fines outstanding: 235.

**Common mistake:** computing lateness from `returned_on` alone. Books still out have no return date, so the overdue days are `NULL` and the two biggest risks, the books not yet back, drop out of the report.

## Wrong answers

Feedback: incorrect-output

```sql
WITH loans(loan_id, member, borrowed_on, due_on, returned_on) AS ( VALUES (1, 'Asha', '2025-02-01', '2025-02-15', '2025-02-14'), (2, 'Asha', '2025-02-20', '2025-03-06', '2025-03-10'), (3, 'Ravi', '2025-02-05', '2025-02-19', '2025-03-15'), (4, 'Meera', '2025-03-01', '2025-03-15', NULL), (5, 'Kiran', '2025-03-10', '2025-03-24', NULL), (6, 'Ravi', '2025-03-02', '2025-03-16', '2025-03-16') ), fines AS (SELECT loan_id, member, due_on, returned_on, CAST(julianday(returned_on) - julianday(due_on) AS INTEGER) AS days_overdue, MIN(CAST(julianday(returned_on) - julianday(due_on) AS INTEGER) * 5, 100) AS fine, 'returned late' AS state FROM loans WHERE julianday(returned_on) - julianday(due_on) > 0) SELECT * FROM (SELECT loan_id, member, due_on, returned_on, days_overdue, fine, state FROM fines UNION ALL SELECT NULL, 'Total', NULL, NULL, NULL, SUM(fine), NULL FROM fines) ORDER BY loan_id IS NULL, loan_id;
```
