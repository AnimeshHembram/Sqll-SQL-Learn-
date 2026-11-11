---
id: da-day-145
title: Match bank lines to payments
order: 145
difficulty: advanced
topic: Data quality
summary: Pair records one-to-one when several candidates look alike, then report what is left on each side.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pair records one-to-one with ROW_NUMBER
  - Report unmatched records from both sides
prerequisites:
  - Day 95
  - Day 71
---

## Task

Finance reconciles recorded payments with bank statement lines (in the starter query). A payment matches a bank line with the **same amount** booked **0 to 2 days after** the payment date. Each bank line can match only one payment and each payment only one line: when several have the same amount, pair them in date order (the earliest payment with the earliest bank line, and so on).

Return one row per payment and per unmatched bank line: `pay_id`, `line_id` and `status`: `'matched'`, `'payment not in bank'` or `'bank line not in payments'`. Sort payments first, by `pay_id`, then unmatched bank lines by `line_id`.

## Starter query

```sql
WITH payments(pay_id, amount, paid_on) AS (
  VALUES ('P1', 50.00, '2025-03-01'), ('P2', 50.00, '2025-03-02'), ('P3', 75.00, '2025-03-03'),
         ('P4', 20.00, '2025-03-05'), ('P5', 33.33, '2025-03-06')
),
bank_lines(line_id, amount, booked_on) AS (
  VALUES ('B1', 50.00, '2025-03-02'), ('B2', 50.00, '2025-03-03'), ('B3', 75.00, '2025-03-08'),
         ('B4', 20.00, '2025-03-05'), ('B5', 99.00, '2025-03-06')
)
SELECT p.pay_id, p.amount, p.paid_on, b.line_id, b.booked_on
FROM payments AS p
LEFT JOIN bank_lines AS b ON b.amount = p.amount
ORDER BY p.pay_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The starter query shows why a plain join on the amount is not enough: P1 and P2 each match both 50.00 lines.
2. Number payments and bank lines within each amount by date: `ROW_NUMBER() OVER (PARTITION BY amount ORDER BY paid_on)` and the same for the bank by `booked_on`. Pair rows with the same amount **and** the same number, then check the date window.
3. Build `matched` pairs in a CTE. Then `LEFT JOIN` payments to it for the first part, and add (`UNION ALL`) the bank lines that are `NOT IN` the matched lines. Put the union in a CTE and sort the outer query with `ORDER BY pay_id IS NULL, pay_id, line_id` (SQLite only allows sorting by plain output columns directly after a `UNION`).

## Solution

```sql
WITH payments(pay_id, amount, paid_on) AS (
  VALUES ('P1', 50.00, '2025-03-01'), ('P2', 50.00, '2025-03-02'), ('P3', 75.00, '2025-03-03'),
         ('P4', 20.00, '2025-03-05'), ('P5', 33.33, '2025-03-06')
),
bank_lines(line_id, amount, booked_on) AS (
  VALUES ('B1', 50.00, '2025-03-02'), ('B2', 50.00, '2025-03-03'), ('B3', 75.00, '2025-03-08'),
         ('B4', 20.00, '2025-03-05'), ('B5', 99.00, '2025-03-06')
),
numbered_payments AS (
  SELECT pay_id, amount, paid_on, ROW_NUMBER() OVER (PARTITION BY amount ORDER BY paid_on, pay_id) AS n FROM payments
),
numbered_lines AS (
  SELECT line_id, amount, booked_on, ROW_NUMBER() OVER (PARTITION BY amount ORDER BY booked_on, line_id) AS n FROM bank_lines
),
matched AS (
  SELECT p.pay_id, b.line_id
  FROM numbered_payments AS p
  JOIN numbered_lines AS b ON b.amount = p.amount AND b.n = p.n
  WHERE julianday(b.booked_on) - julianday(p.paid_on) BETWEEN 0 AND 2
),
report AS (
  SELECT p.pay_id, m.line_id,
    CASE WHEN m.line_id IS NULL THEN 'payment not in bank' ELSE 'matched' END AS status
  FROM payments AS p
  LEFT JOIN matched AS m ON m.pay_id = p.pay_id
  UNION ALL
  SELECT NULL, b.line_id, 'bank line not in payments'
  FROM bank_lines AS b
  WHERE b.line_id NOT IN (SELECT line_id FROM matched)
)
SELECT pay_id, line_id, status
FROM report
ORDER BY pay_id IS NULL, pay_id, line_id;
```

## Expected result

| pay_id | line_id | status |
| --- | --- | --- |
| P1 | B1 | matched |
| P2 | B2 | matched |
| P3 | NULL | payment not in bank |
| P4 | B4 | matched |
| P5 | NULL | payment not in bank |
| NULL | B3 | bank line not in payments |
| NULL | B5 | bank line not in payments |

## Explanation

Matching on amount alone pairs P1 with both 50.00 lines and P2 with both too, so lines would be "used" twice. Numbering the candidates within each amount and pairing equal numbers enforces **one-to-one** matching, a simple version of what reconciliation tools do.

P3's bank line arrived five days later, outside the window, so both P3 and B3 are reported for someone to check: probably the same money, delayed. P5 never reached the bank, and B5 is money nobody recorded.

This pairing is simple and works when amounts are distinctive. If an early payment had no bank line, the numbering could pair later items wrongly; real reconciliation adds references or tries alternative pairings.

**Common mistake:** joining on amount and date window without enforcing one-to-one matching, which produces extra matched rows and hides genuine gaps.

## Wrong answers

Feedback: extra-rows

```sql
WITH payments(pay_id, amount, paid_on) AS ( VALUES ('P1', 50.00, '2025-03-01'), ('P2', 50.00, '2025-03-02'), ('P3', 75.00, '2025-03-03'), ('P4', 20.00, '2025-03-05'), ('P5', 33.33, '2025-03-06') ), bank_lines(line_id, amount, booked_on) AS ( VALUES ('B1', 50.00, '2025-03-02'), ('B2', 50.00, '2025-03-03'), ('B3', 75.00, '2025-03-08'), ('B4', 20.00, '2025-03-05'), ('B5', 99.00, '2025-03-06') ), matched AS (SELECT p.pay_id, b.line_id FROM payments AS p JOIN bank_lines AS b ON b.amount = p.amount WHERE julianday(b.booked_on) - julianday(p.paid_on) BETWEEN 0 AND 2), report AS (SELECT p.pay_id, m.line_id, CASE WHEN m.line_id IS NULL THEN 'payment not in bank' ELSE 'matched' END AS status FROM payments AS p LEFT JOIN matched AS m ON m.pay_id = p.pay_id UNION ALL SELECT NULL, b.line_id, 'bank line not in payments' FROM bank_lines AS b WHERE b.line_id NOT IN (SELECT line_id FROM matched)) SELECT pay_id, line_id, status FROM report ORDER BY pay_id IS NULL, pay_id, line_id;
```
