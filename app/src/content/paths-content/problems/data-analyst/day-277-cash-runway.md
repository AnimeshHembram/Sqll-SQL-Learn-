---
id: da-day-277
title: When does the cash balance dip below the minimum?
order: 277
difficulty: intermediate
topic: Financial analysis
summary: Run the cash balance forward day by day and flag the days it falls under the safety minimum.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Run a balance forward
  - Combine same-day movements before a running total
prerequisites:
  - Day 40
  - Day 106
---

## Task

The treasury keeps at least **₹1,00,000** in the bank. From April's cash movements (starter query, including the opening balance), compute the closing balance of each day that had movements (combine movements on the same day).

Return `day`, `net_movement`, `closing_balance` and `below_minimum` (`'yes'` when the closing balance is under 100,000, else `'no'`). Sort by `day`.

## Starter query

```sql
WITH cash_movements(day, description, amount) AS (
  VALUES
    ('2025-04-01', 'Opening balance', 250000), ('2025-04-03', 'Supplier payment', -180000), ('2025-04-05', 'Customer receipts', 90000),
    ('2025-04-07', 'Payroll', -150000), ('2025-04-07', 'Customer receipts', 40000), ('2025-04-10', 'Rent', -60000),
    ('2025-04-12', 'Customer receipts', 120000), ('2025-04-15', 'Tax payment', -45000), ('2025-04-18', 'Customer receipts', 70000)
)
SELECT day, description, amount
FROM cash_movements
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Combine each day's movements first: `SUM(amount)` grouped by `day`.
3. The closing balance is a running total of the daily nets: `SUM(net) OVER (ORDER BY day)`. Compare it with 100,000.

## Solution

```sql
WITH cash_movements(day, description, amount) AS (
  VALUES
    ('2025-04-01', 'Opening balance', 250000), ('2025-04-03', 'Supplier payment', -180000), ('2025-04-05', 'Customer receipts', 90000),
    ('2025-04-07', 'Payroll', -150000), ('2025-04-07', 'Customer receipts', 40000), ('2025-04-10', 'Rent', -60000),
    ('2025-04-12', 'Customer receipts', 120000), ('2025-04-15', 'Tax payment', -45000), ('2025-04-18', 'Customer receipts', 70000)
),
daily AS (
  SELECT day, SUM(amount) AS net_movement FROM cash_movements GROUP BY day
),
balances AS (
  SELECT day, net_movement, SUM(net_movement) OVER (ORDER BY day) AS closing_balance FROM daily
)
SELECT day, net_movement, closing_balance, CASE WHEN closing_balance < 100000 THEN 'yes' ELSE 'no' END AS below_minimum
FROM balances
ORDER BY day;
```

## Expected result

| day | net_movement | closing_balance | below_minimum |
| --- | --- | --- | --- |
| 2025-04-01 | 250000 | 250000 | no |
| 2025-04-03 | -180000 | 70000 | yes |
| 2025-04-05 | 90000 | 160000 | no |
| 2025-04-07 | -110000 | 50000 | yes |
| 2025-04-10 | -60000 | -10000 | yes |
| 2025-04-12 | 120000 | 110000 | no |
| 2025-04-15 | -45000 | 65000 | yes |
| 2025-04-18 | 70000 | 135000 | no |

## Explanation

A cash forecast is a running total of daily net movements, starting from the opening balance. Grouping by day first matters: 7 April has payroll out and receipts in, and the balance that matters is the one at the end of the day (50,000), not after each line.

The minimum is breached four times, and on 10 April the account goes **negative** (−10,000) when rent is paid before the next receipts arrive on the 12th. That is the kind of finding a treasurer acts on: move the rent payment by two days, or arrange a short credit line.

**Common mistake:** running the total over individual movements. The day with two movements appears twice, with a misleading intermediate balance after the payroll line.

## Wrong answers

Feedback: incorrect-output

```sql
WITH cash_movements(day, description, amount) AS ( VALUES ('2025-04-01', 'Opening balance', 250000), ('2025-04-03', 'Supplier payment', -180000), ('2025-04-05', 'Customer receipts', 90000), ('2025-04-07', 'Payroll', -150000), ('2025-04-07', 'Customer receipts', 40000), ('2025-04-10', 'Rent', -60000), ('2025-04-12', 'Customer receipts', 120000), ('2025-04-15', 'Tax payment', -45000), ('2025-04-18', 'Customer receipts', 70000) ) SELECT day, amount AS net_movement, SUM(amount) OVER (ORDER BY day, description) AS closing_balance, CASE WHEN SUM(amount) OVER (ORDER BY day, description) < 100000 THEN 'yes' ELSE 'no' END AS below_minimum FROM cash_movements ORDER BY day;
```

Feedback: incorrect-output

```sql
WITH cash_movements(day, description, amount) AS ( VALUES ('2025-04-01', 'Opening balance', 250000), ('2025-04-03', 'Supplier payment', -180000), ('2025-04-05', 'Customer receipts', 90000), ('2025-04-07', 'Payroll', -150000), ('2025-04-07', 'Customer receipts', 40000), ('2025-04-10', 'Rent', -60000), ('2025-04-12', 'Customer receipts', 120000), ('2025-04-15', 'Tax payment', -45000), ('2025-04-18', 'Customer receipts', 70000) ), daily AS (SELECT day, SUM(amount) AS net_movement FROM cash_movements WHERE description <> 'Opening balance' GROUP BY day) SELECT day, net_movement, SUM(net_movement) OVER (ORDER BY day) AS closing_balance, CASE WHEN SUM(net_movement) OVER (ORDER BY day) < 100000 THEN 'yes' ELSE 'no' END AS below_minimum FROM daily ORDER BY day;
```
