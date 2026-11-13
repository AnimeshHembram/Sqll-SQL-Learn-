---
id: da-day-259
title: Invoices that break business rules
order: 259
difficulty: intermediate
topic: Data quality
summary: Check rules that compare fields within a row, and list each broken rule.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Check rules across fields
  - Report one row per broken rule
prerequisites:
  - Day 142
  - Day 198
---

## Task

Each invoice (starter query) must satisfy four rules:

1. `due_after_issue`: `due_on` is on or after `issued_on`,
2. `paid_after_issue`: `paid_on`, when present, is on or after `issued_on`,
3. `total_adds_up`: `total = subtotal + tax`,
4. `status_matches`: `status` is `'paid'` exactly when `paid_on` is not `NULL`.

Return one row per broken rule: `id` and `rule` (the rule's name). Sort by `id`, then rule number. Invoices that break no rule do not appear.

## Starter query

```sql
WITH invoices(id, issued_on, due_on, paid_on, subtotal, tax, total, status) AS (
  VALUES
    (1, '2025-03-01', '2025-03-31', '2025-03-20', 1000, 180, 1180, 'paid'),
    (2, '2025-03-02', '2025-02-28', NULL, 500, 90, 590, 'open'),
    (3, '2025-03-03', '2025-04-02', '2025-03-01', 800, 144, 944, 'paid'),
    (4, '2025-03-04', '2025-04-03', NULL, 1200, 216, 1400, 'open'),
    (5, '2025-03-05', '2025-04-04', '2025-03-25', 300, 54, 354, 'open'),
    (6, '2025-03-06', '2025-04-05', NULL, 700, 126, 826, 'paid'),
    (7, '2025-03-07', '2025-04-06', NULL, 900, 162, 1062, 'open')
)
SELECT id, issued_on, due_on, paid_on, subtotal, tax, total, status
FROM invoices
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Write one `SELECT` per rule, each selecting `id`, a rule number and the rule name for the invoices that break it, and stack them with `UNION ALL`.
3. Rule 2 must not flag unpaid invoices: `paid_on IS NOT NULL AND paid_on < issued_on`. Rule 4 breaks in two ways: `(status = 'paid') <> (paid_on IS NOT NULL)` covers both.

## Solution

```sql
WITH invoices(id, issued_on, due_on, paid_on, subtotal, tax, total, status) AS (
  VALUES
    (1, '2025-03-01', '2025-03-31', '2025-03-20', 1000, 180, 1180, 'paid'),
    (2, '2025-03-02', '2025-02-28', NULL, 500, 90, 590, 'open'),
    (3, '2025-03-03', '2025-04-02', '2025-03-01', 800, 144, 944, 'paid'),
    (4, '2025-03-04', '2025-04-03', NULL, 1200, 216, 1400, 'open'),
    (5, '2025-03-05', '2025-04-04', '2025-03-25', 300, 54, 354, 'open'),
    (6, '2025-03-06', '2025-04-05', NULL, 700, 126, 826, 'paid'),
    (7, '2025-03-07', '2025-04-06', NULL, 900, 162, 1062, 'open')
),
broken AS (
  SELECT id, 1 AS rule_no, 'due_after_issue' AS rule FROM invoices WHERE due_on < issued_on
  UNION ALL
  SELECT id, 2, 'paid_after_issue' FROM invoices WHERE paid_on IS NOT NULL AND paid_on < issued_on
  UNION ALL
  SELECT id, 3, 'total_adds_up' FROM invoices WHERE total <> subtotal + tax
  UNION ALL
  SELECT id, 4, 'status_matches' FROM invoices WHERE (status = 'paid') <> (paid_on IS NOT NULL)
)
SELECT id, rule
FROM broken
ORDER BY id, rule_no;
```

## Expected result

| id | rule |
| --- | --- |
| 2 | due_after_issue |
| 3 | paid_after_issue |
| 4 | total_adds_up |
| 5 | status_matches |
| 6 | status_matches |

## Explanation

Cross-field rules compare values within one row: dates in the right order, amounts that add up, statuses that agree with the data. One `SELECT` per rule, stacked with `UNION ALL`, gives one row per broken rule, so an invoice breaking two rules would get two rows and each rule can be fixed by the right team.

The `NULL` cases need care. Invoice 2 is due before it was issued; invoice 3 was paid before it existed. Unpaid invoices have no `paid_on`, so rule 2 checks `paid_on IS NOT NULL` explicitly. Rule 4 breaks both ways: invoice 5 has a payment date but is still `'open'`, and invoice 6 is `'paid'` with no payment recorded. Comparing the two conditions as truth values, `(status = 'paid') <> (paid_on IS NOT NULL)`, catches both. Invoice 4's total is 4 too high.

**Common mistake:** checking only one direction of the status rule. Invoices marked open with a payment date, like invoice 5, pass unnoticed.

## Wrong answers

Feedback: missing-rows

```sql
WITH invoices(id, issued_on, due_on, paid_on, subtotal, tax, total, status) AS ( VALUES (1, '2025-03-01', '2025-03-31', '2025-03-20', 1000, 180, 1180, 'paid'), (2, '2025-03-02', '2025-02-28', NULL, 500, 90, 590, 'open'), (3, '2025-03-03', '2025-04-02', '2025-03-01', 800, 144, 944, 'paid'), (4, '2025-03-04', '2025-04-03', NULL, 1200, 216, 1400, 'open'), (5, '2025-03-05', '2025-04-04', '2025-03-25', 300, 54, 354, 'open'), (6, '2025-03-06', '2025-04-05', NULL, 700, 126, 826, 'paid'), (7, '2025-03-07', '2025-04-06', NULL, 900, 162, 1062, 'open') ), broken AS (SELECT id, 1 AS rule_no, 'due_after_issue' AS rule FROM invoices WHERE due_on < issued_on UNION ALL SELECT id, 2, 'paid_after_issue' FROM invoices WHERE paid_on < issued_on UNION ALL SELECT id, 3, 'total_adds_up' FROM invoices WHERE total <> subtotal + tax UNION ALL SELECT id, 4, 'status_matches' FROM invoices WHERE status = 'paid' AND paid_on IS NULL) SELECT id, rule FROM broken ORDER BY id, rule_no;
```
