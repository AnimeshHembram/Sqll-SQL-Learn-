---
id: da-day-132
title: Recognise annual subscriptions month by month
order: 132
difficulty: advanced
topic: Financial analysis
summary: Spread upfront payments over their service months and track the deferred balance.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Spread amounts over periods (revenue recognition)
  - Clamp values with scalar MIN and MAX
prerequisites:
  - Day 116
  - Day 109
---

## Task

Customers pay for a **year upfront** (in the starter query). Accounting recognises one twelfth of each payment in each of the 12 calendar months starting with the month of `starts_on`. Money received but not yet recognised is **deferred revenue**.

For each month in `months`, return `month`, `recognised` (revenue recognised in that month) and `deferred_end` (deferred revenue at the end of the month: for payments received **by** the end of that month, the amount minus everything recognised up to and including that month). Round both to 2 decimal places. Sort by `month`.

## Starter query

```sql
WITH payments(customer, paid_on, starts_on, amount) AS (
  VALUES
    ('A', '2024-11-01', '2024-11-01', 1200),
    ('D', '2024-03-01', '2024-03-01', 1200),
    ('B', '2025-02-10', '2025-02-15', 1800),
    ('C', '2025-03-25', '2025-04-01', 600)
),
months(month) AS (
  VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04')
)
SELECT customer, paid_on, starts_on, amount, amount / 12.0 AS per_month
FROM payments;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pair every month with every payment and compute `n`, the service month number: months between `starts_on` and the report month, plus 1 (month index = `year * 12 + month`). The payment is recognised in that month when `n` is between 1 and 12.
3. Recognised through a month is `amount / 12.0 * MIN(MAX(n, 0), 12)`. For `deferred_end`, add `amount` minus that, but only for payments with `paid_on` on or before the month's last day, `date(month || '-01', '+1 month', '-1 day')`.

## Solution

```sql
WITH payments(customer, paid_on, starts_on, amount) AS (
  VALUES
    ('A', '2024-11-01', '2024-11-01', 1200),
    ('D', '2024-03-01', '2024-03-01', 1200),
    ('B', '2025-02-10', '2025-02-15', 1800),
    ('C', '2025-03-25', '2025-04-01', 600)
),
months(month) AS (
  VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04')
),
grid AS (
  SELECT m.month, p.amount, p.paid_on,
    (CAST(substr(m.month, 1, 4) AS INTEGER) * 12 + CAST(substr(m.month, 6, 2) AS INTEGER)) - (CAST(substr(p.starts_on, 1, 4) AS INTEGER) * 12 + CAST(substr(p.starts_on, 6, 2) AS INTEGER)) + 1 AS n
  FROM months AS m
  CROSS JOIN payments AS p
)
SELECT month,
  ROUND(SUM(CASE WHEN n BETWEEN 1 AND 12 THEN amount / 12.0 ELSE 0 END), 2) AS recognised,
  ROUND(SUM(CASE
    WHEN paid_on <= date(month || '-01', '+1 month', '-1 day') THEN amount - amount / 12.0 * MIN(MAX(n, 0), 12)
    ELSE 0
  END), 2) AS deferred_end
FROM grid
GROUP BY month
ORDER BY month;
```

## Expected result

| month | recognised | deferred_end |
| --- | --- | --- |
| 2025-01 | 200 | 1000 |
| 2025-02 | 350 | 2450 |
| 2025-03 | 250 | 2800 |
| 2025-04 | 300 | 2500 |

## Explanation

Cash and revenue happen at different times. A 1,200 annual payment is 100 of revenue per month for a year; until it has all been recognised, the rest sits on the balance sheet as deferred revenue.

D's year ran from March 2024 to February 2025, so it contributes to January and February only. B paid on 10 February for a service starting on the 15th: February counts as its first month. C paid in March for a service starting in April, so at the end of March its whole 600 is deferred and nothing is recognised yet. `MIN(MAX(n, 0), 12)` keeps the months-recognised count between 0 and 12, so a payment is never recognised before it starts or beyond its year.

**Common mistake:** recognising revenue from the payment date instead of the service start date, which moves C's revenue into March.

## Wrong answers

Feedback: incorrect-output

```sql
WITH payments(customer, paid_on, starts_on, amount) AS ( VALUES ('A', '2024-11-01', '2024-11-01', 1200), ('D', '2024-03-01', '2024-03-01', 1200), ('B', '2025-02-10', '2025-02-15', 1800), ('C', '2025-03-25', '2025-04-01', 600) ), months(month) AS ( VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04') ), grid AS (SELECT m.month, p.amount, p.paid_on, (CAST(substr(m.month, 1, 4) AS INTEGER) * 12 + CAST(substr(m.month, 6, 2) AS INTEGER)) - (CAST(substr(p.paid_on, 1, 4) AS INTEGER) * 12 + CAST(substr(p.paid_on, 6, 2) AS INTEGER)) + 1 AS n FROM months AS m CROSS JOIN payments AS p) SELECT month, ROUND(SUM(CASE WHEN n BETWEEN 1 AND 12 THEN amount / 12.0 ELSE 0 END), 2) AS recognised, ROUND(SUM(CASE WHEN paid_on <= date(month || '-01', '+1 month', '-1 day') THEN amount - amount / 12.0 * MIN(MAX(n, 0), 12) ELSE 0 END), 2) AS deferred_end FROM grid GROUP BY month ORDER BY month;
```
