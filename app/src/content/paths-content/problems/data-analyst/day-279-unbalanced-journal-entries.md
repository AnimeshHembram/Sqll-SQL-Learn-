---
id: da-day-279
title: Journal entries that do not balance
order: 279
difficulty: intermediate
topic: Financial analysis
summary: Check double-entry bookkeeping: every entry's debits must equal its credits, and empty entries are errors too.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Check that debits equal credits
  - Catch empty records as well as unbalanced ones
prerequisites:
  - Day 170
  - Day 71
---

## Task

In double-entry bookkeeping, each journal entry's **debits must equal its credits**, and an entry must move some money. Check every entry in the starter query and return the problem ones: `entry`, `lines`, `total_debit`, `total_credit`, `difference` (debits − credits) and `issue` (`'unbalanced'` or `'empty'` when both totals are 0).

Then add a final row `entry` `NULL`, `issue` = `'all entries'`, with the totals over **all** entries in the totals columns and `lines`. Sort the problem entries by `entry`, with the summary last.

## Starter query

```sql
WITH journal_lines(entry, line, account, debit, credit) AS (
  VALUES
    (1, 1, 'Cash', 5000, 0), (1, 2, 'Sales', 0, 5000),
    (2, 1, 'Rent expense', 30000, 0), (2, 2, 'Cash', 0, 30000),
    (3, 1, 'Inventory', 12000, 0), (3, 2, 'Payables', 0, 11000),
    (4, 1, 'Cash', 8000, 0), (4, 2, 'Receivables', 0, 8000),
    (5, 1, 'Salaries expense', 40000, 0), (5, 2, 'Cash', 0, 38000), (5, 3, 'Tax payable', 0, 2000),
    (6, 1, 'Cash', 0, 0)
)
SELECT entry, line, account, debit, credit
FROM journal_lines
ORDER BY entry, line;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per entry: `COUNT(*)`, `SUM(debit)`, `SUM(credit)`. Keep entries where the totals differ or both are 0.
3. Add the summary with `UNION ALL` over all lines, and sort with `ORDER BY entry IS NULL, entry`.

## Solution

```sql
WITH journal_lines(entry, line, account, debit, credit) AS (
  VALUES
    (1, 1, 'Cash', 5000, 0), (1, 2, 'Sales', 0, 5000),
    (2, 1, 'Rent expense', 30000, 0), (2, 2, 'Cash', 0, 30000),
    (3, 1, 'Inventory', 12000, 0), (3, 2, 'Payables', 0, 11000),
    (4, 1, 'Cash', 8000, 0), (4, 2, 'Receivables', 0, 8000),
    (5, 1, 'Salaries expense', 40000, 0), (5, 2, 'Cash', 0, 38000), (5, 3, 'Tax payable', 0, 2000),
    (6, 1, 'Cash', 0, 0)
),
entries AS (
  SELECT entry, COUNT(*) AS lines, SUM(debit) AS total_debit, SUM(credit) AS total_credit FROM journal_lines GROUP BY entry
),
problems AS (
  SELECT entry, lines, total_debit, total_credit, total_debit - total_credit AS difference,
    CASE WHEN total_debit = 0 AND total_credit = 0 THEN 'empty' ELSE 'unbalanced' END AS issue
  FROM entries
  WHERE total_debit <> total_credit OR (total_debit = 0 AND total_credit = 0)
)
SELECT * FROM (
  SELECT * FROM problems
  UNION ALL
  SELECT NULL, COUNT(*), SUM(debit), SUM(credit), SUM(debit) - SUM(credit), 'all entries' FROM journal_lines
)
ORDER BY entry IS NULL, entry;
```

## Expected result

| entry | lines | total_debit | total_credit | difference | issue |
| --- | --- | --- | --- | --- | --- |
| 3 | 2 | 12000 | 11000 | 1000 | unbalanced |
| 6 | 1 | 0 | 0 | 0 | empty |
| NULL | 12 | 95000 | 94000 | 1000 | all entries |

## Explanation

Double-entry bookkeeping means every entry's debits equal its credits, so a trial balance that does not balance always traces back to specific entries. Entry 3 records 12,000 of inventory against only 11,000 of payables: a 1,000 difference that explains the whole imbalance in the summary row (95,000 debits against 94,000 credits).

Entry 5 has three lines and balances (40,000 against 38,000 + 2,000), which is why the check has to sum per entry rather than compare lines in pairs. Entry 6 is balanced but empty, a placeholder or a failed import, and should be flagged too: an entry that moves no money is not a valid transaction.

**Common mistake:** checking only `debit <> credit`. The empty entry balances perfectly and is never reported.

## Wrong answers

Feedback: missing-rows

```sql
WITH journal_lines(entry, line, account, debit, credit) AS ( VALUES (1, 1, 'Cash', 5000, 0), (1, 2, 'Sales', 0, 5000), (2, 1, 'Rent expense', 30000, 0), (2, 2, 'Cash', 0, 30000), (3, 1, 'Inventory', 12000, 0), (3, 2, 'Payables', 0, 11000), (4, 1, 'Cash', 8000, 0), (4, 2, 'Receivables', 0, 8000), (5, 1, 'Salaries expense', 40000, 0), (5, 2, 'Cash', 0, 38000), (5, 3, 'Tax payable', 0, 2000), (6, 1, 'Cash', 0, 0) ), entries AS (SELECT entry, COUNT(*) AS lines, SUM(debit) AS total_debit, SUM(credit) AS total_credit FROM journal_lines GROUP BY entry) SELECT * FROM (SELECT entry, lines, total_debit, total_credit, total_debit - total_credit AS difference, 'unbalanced' AS issue FROM entries WHERE total_debit <> total_credit UNION ALL SELECT NULL, COUNT(*), SUM(debit), SUM(credit), SUM(debit) - SUM(credit), 'all entries' FROM journal_lines) ORDER BY entry IS NULL, entry;
```
