---
id: da-day-280
title: Month-end accruals for March
order: 280
difficulty: advanced
topic: Financial analysis
summary: Find March services not yet invoiced by month end and accrue their March share.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Apply the accrual principle
  - Prorate an amount to a period
prerequisites:
  - Day 220
  - Day 132
---

## Task

At the **31 March 2025** close, expenses must be recorded in the month the service was used, even if the invoice arrives later. An invoice (starter query) needs an **accrual** when part of its service period falls in March and it was received **after** 31 March. The accrued amount is the invoice amount × the share of its service days that fall in March (service periods are inclusive).

Return `invoice`, `supplier`, `march_days`, `service_days` and `accrual` (rounded to 2 decimal places) for invoices that need one, then a final row `supplier` = `'Total accrual'` with the sum in `accrual` (other columns `NULL`). Sort by `invoice`, with the total last.

## Starter query

```sql
WITH invoices(invoice, supplier, service_from, service_to, received_on, amount) AS (
  VALUES
    (1, 'CloudCo', '2025-03-01', '2025-03-31', '2025-03-28', 31000),
    (2, 'CleanPro', '2025-03-01', '2025-03-31', '2025-04-05', 18600),
    (3, 'AdAgency', '2025-03-16', '2025-04-15', '2025-04-20', 60000),
    (4, 'PowerGrid', '2025-02-15', '2025-03-14', '2025-04-02', 28000),
    (5, 'Security', '2025-04-01', '2025-04-30', '2025-03-30', 15000),
    (6, 'Legal', '2025-03-10', '2025-03-10', '2025-04-11', 9000)
)
SELECT invoice, supplier, service_from, service_to, received_on, amount
FROM invoices
ORDER BY invoice;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Clip each service period to March: from `MAX(service_from, '2025-03-01')` to `MIN(service_to, '2025-03-31')`. Days are `julianday(to) - julianday(from) + 1`, and only positive values mean the service touched March.
3. Keep invoices received after `'2025-03-31'` with March days, accrue `amount * march_days / service_days`, and add the total with `UNION ALL`.

## Solution

```sql
WITH invoices(invoice, supplier, service_from, service_to, received_on, amount) AS (
  VALUES
    (1, 'CloudCo', '2025-03-01', '2025-03-31', '2025-03-28', 31000),
    (2, 'CleanPro', '2025-03-01', '2025-03-31', '2025-04-05', 18600),
    (3, 'AdAgency', '2025-03-16', '2025-04-15', '2025-04-20', 60000),
    (4, 'PowerGrid', '2025-02-15', '2025-03-14', '2025-04-02', 28000),
    (5, 'Security', '2025-04-01', '2025-04-30', '2025-03-30', 15000),
    (6, 'Legal', '2025-03-10', '2025-03-10', '2025-04-11', 9000)
),
clipped AS (
  SELECT invoice, supplier, amount, received_on,
    julianday(MIN(service_to, '2025-03-31')) - julianday(MAX(service_from, '2025-03-01')) + 1 AS march_days,
    julianday(service_to) - julianday(service_from) + 1 AS service_days
  FROM invoices
),
accruals AS (
  SELECT invoice, supplier, CAST(march_days AS INTEGER) AS march_days, CAST(service_days AS INTEGER) AS service_days,
    amount * march_days / service_days AS accrual
  FROM clipped
  WHERE march_days > 0 AND received_on > '2025-03-31'
)
SELECT * FROM (
  SELECT invoice, supplier, march_days, service_days, ROUND(accrual, 2) AS accrual FROM accruals
  UNION ALL
  SELECT NULL, 'Total accrual', NULL, NULL, ROUND(SUM(accrual), 2) FROM accruals
)
ORDER BY invoice IS NULL, invoice;
```

## Expected result

| invoice | supplier | march_days | service_days | accrual |
| --- | --- | --- | --- | --- |
| 2 | CleanPro | 31 | 31 | 18600 |
| 3 | AdAgency | 16 | 31 | 30967.74 |
| 4 | PowerGrid | 14 | 28 | 14000 |
| 6 | Legal | 1 | 1 | 9000 |
| NULL | Total accrual | NULL | NULL | 72567.74 |

## Explanation

The accrual principle records an expense in the month the service was used. Invoices received after the close need an accrual for their March share: CleanPro's whole invoice (the service was all in March), half of PowerGrid's (14 of its 28 days fell in March) and the legal one-day job. AdAgency's campaign ran from 16 March to 15 April, so 16 of its 31 days, 30,967.74, belong in March.

CloudCo's invoice arrived in March, so it is already in the books and needs no accrual, and Security's April service has no March days. Clipping each service period to March, as in prorated billing (Day 220), gives the days; the total accrual of 72,567.74 is the journal entry finance posts at month end.

**Common mistake:** accruing the full invoice amount. AdAgency's and PowerGrid's April and February days end up in March's expenses, overstating them by more than 43,000.

## Wrong answers

Feedback: incorrect-output

```sql
WITH invoices(invoice, supplier, service_from, service_to, received_on, amount) AS ( VALUES (1, 'CloudCo', '2025-03-01', '2025-03-31', '2025-03-28', 31000), (2, 'CleanPro', '2025-03-01', '2025-03-31', '2025-04-05', 18600), (3, 'AdAgency', '2025-03-16', '2025-04-15', '2025-04-20', 60000), (4, 'PowerGrid', '2025-02-15', '2025-03-14', '2025-04-02', 28000), (5, 'Security', '2025-04-01', '2025-04-30', '2025-03-30', 15000), (6, 'Legal', '2025-03-10', '2025-03-10', '2025-04-11', 9000) ), accruals AS (SELECT invoice, supplier, CAST(julianday(MIN(service_to, '2025-03-31')) - julianday(MAX(service_from, '2025-03-01')) + 1 AS INTEGER) AS march_days, CAST(julianday(service_to) - julianday(service_from) + 1 AS INTEGER) AS service_days, amount AS accrual FROM invoices WHERE julianday(MIN(service_to, '2025-03-31')) - julianday(MAX(service_from, '2025-03-01')) + 1 > 0 AND received_on > '2025-03-31') SELECT * FROM (SELECT invoice, supplier, march_days, service_days, ROUND(accrual, 2) AS accrual FROM accruals UNION ALL SELECT NULL, 'Total accrual', NULL, NULL, ROUND(SUM(accrual), 2) FROM accruals) ORDER BY invoice IS NULL, invoice;
```
