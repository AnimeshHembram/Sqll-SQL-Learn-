---
id: da-day-133
title: Accounts receivable ageing
order: 133
difficulty: advanced
topic: Financial analysis
summary: Net partial payments against invoices and bucket what is still owed by days overdue.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Net payments against invoices as of a date
  - Pivot amounts into age buckets
prerequisites:
  - Day 71
  - Day 114
---

## Task

Finance needs an **ageing report as of 2025-03-31** (data in the starter query). An invoice's outstanding amount is its amount minus payments made **on or before** 2025-03-31. Fully paid invoices are ignored. Days overdue = days from `due_on` to 2025-03-31.

For each customer with something outstanding, return `customer`, then the outstanding amounts in buckets: `current_due` (not overdue: 0 days or less), `d1_30`, `d31_60`, `d61_90`, `over_90`, and `total_outstanding`. Empty buckets show 0. Sort by `customer`.

## Starter query

```sql
WITH invoices(id, customer, issued_on, due_on, amount) AS (
  VALUES
    (1, 'Acme', '2025-01-05', '2025-02-04', 500),
    (2, 'Acme', '2025-03-10', '2025-04-09', 400),
    (3, 'Bolt', '2024-12-01', '2024-12-31', 300),
    (4, 'Bolt', '2024-12-15', '2025-01-14', 250),
    (5, 'Cora', '2024-11-10', '2024-12-10', 600),
    (6, 'Cora', '2025-03-01', '2025-03-31', 150),
    (7, 'Dune', '2025-02-20', '2025-03-22', 90)
),
invoice_payments(invoice_id, paid_on, amount) AS (
  VALUES (1, '2025-02-10', 200), (3, '2025-01-15', 300), (4, '2025-04-02', 100), (5, '2025-01-20', 100)
)
SELECT id, customer, due_on, amount
FROM invoices
ORDER BY customer, id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per invoice: `amount - COALESCE((SELECT SUM(p.amount) FROM invoice_payments AS p WHERE p.invoice_id = i.id AND p.paid_on <= '2025-03-31'), 0)`, and days overdue `CAST(julianday('2025-03-31') - julianday(due_on) AS INTEGER)`.
3. Keep invoices with something outstanding, then group by customer and use one `SUM(CASE WHEN days_overdue BETWEEN 1 AND 30 THEN outstanding ELSE 0 END)` per bucket.

## Solution

```sql
WITH invoices(id, customer, issued_on, due_on, amount) AS (
  VALUES
    (1, 'Acme', '2025-01-05', '2025-02-04', 500),
    (2, 'Acme', '2025-03-10', '2025-04-09', 400),
    (3, 'Bolt', '2024-12-01', '2024-12-31', 300),
    (4, 'Bolt', '2024-12-15', '2025-01-14', 250),
    (5, 'Cora', '2024-11-10', '2024-12-10', 600),
    (6, 'Cora', '2025-03-01', '2025-03-31', 150),
    (7, 'Dune', '2025-02-20', '2025-03-22', 90)
),
invoice_payments(invoice_id, paid_on, amount) AS (
  VALUES (1, '2025-02-10', 200), (3, '2025-01-15', 300), (4, '2025-04-02', 100), (5, '2025-01-20', 100)
),
open_invoices AS (
  SELECT i.customer,
    i.amount - COALESCE((
      SELECT SUM(p.amount) FROM invoice_payments AS p
      WHERE p.invoice_id = i.id AND p.paid_on <= '2025-03-31'
    ), 0) AS outstanding,
    CAST(julianday('2025-03-31') - julianday(i.due_on) AS INTEGER) AS days_overdue
  FROM invoices AS i
)
SELECT customer,
  SUM(CASE WHEN days_overdue <= 0 THEN outstanding ELSE 0 END) AS current_due,
  SUM(CASE WHEN days_overdue BETWEEN 1 AND 30 THEN outstanding ELSE 0 END) AS d1_30,
  SUM(CASE WHEN days_overdue BETWEEN 31 AND 60 THEN outstanding ELSE 0 END) AS d31_60,
  SUM(CASE WHEN days_overdue BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS d61_90,
  SUM(CASE WHEN days_overdue > 90 THEN outstanding ELSE 0 END) AS over_90,
  SUM(outstanding) AS total_outstanding
FROM open_invoices
WHERE outstanding > 0
GROUP BY customer
ORDER BY customer;
```

## Expected result

| customer | current_due | d1_30 | d31_60 | d61_90 | over_90 | total_outstanding |
| --- | --- | --- | --- | --- | --- | --- |
| Acme | 400 | 0 | 300 | 0 | 0 | 700 |
| Bolt | 0 | 0 | 0 | 250 | 0 | 250 |
| Cora | 150 | 0 | 0 | 0 | 500 | 650 |
| Dune | 0 | 90 | 0 | 0 | 0 | 90 |

## Explanation

An ageing report shows how long customers have owed money; older debts are less likely to be paid. Three details decide whether it is right:

- **Partial payments** reduce the balance: Acme's first invoice has 300 of 500 outstanding.
- **The as-of date** limits which payments count: Bolt's payment on 2 April is after the report date, so all 250 is still outstanding at the end of March.
- **Bucket edges**: Cora's March invoice is due on 31 March, 0 days overdue, so it is current; the over-90 bucket starts at 91.

Bolt's December invoice was paid in full and does not appear.

**Common mistakes:** counting payments made after the report date, and ageing from the issue date instead of the due date.

## Wrong answers

Feedback: incorrect-output

```sql
WITH invoices(id, customer, issued_on, due_on, amount) AS ( VALUES (1, 'Acme', '2025-01-05', '2025-02-04', 500), (2, 'Acme', '2025-03-10', '2025-04-09', 400), (3, 'Bolt', '2024-12-01', '2024-12-31', 300), (4, 'Bolt', '2024-12-15', '2025-01-14', 250), (5, 'Cora', '2024-11-10', '2024-12-10', 600), (6, 'Cora', '2025-03-01', '2025-03-31', 150), (7, 'Dune', '2025-02-20', '2025-03-22', 90) ), invoice_payments(invoice_id, paid_on, amount) AS ( VALUES (1, '2025-02-10', 200), (3, '2025-01-15', 300), (4, '2025-04-02', 100), (5, '2025-01-20', 100) ), open_invoices AS (SELECT i.customer, i.amount - COALESCE((SELECT SUM(p.amount) FROM invoice_payments AS p WHERE p.invoice_id = i.id), 0) AS outstanding, CAST(julianday('2025-03-31') - julianday(i.due_on) AS INTEGER) AS days_overdue FROM invoices AS i) SELECT customer, SUM(CASE WHEN days_overdue <= 0 THEN outstanding ELSE 0 END) AS current_due, SUM(CASE WHEN days_overdue BETWEEN 1 AND 30 THEN outstanding ELSE 0 END) AS d1_30, SUM(CASE WHEN days_overdue BETWEEN 31 AND 60 THEN outstanding ELSE 0 END) AS d31_60, SUM(CASE WHEN days_overdue BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS d61_90, SUM(CASE WHEN days_overdue > 90 THEN outstanding ELSE 0 END) AS over_90, SUM(outstanding) AS total_outstanding FROM open_invoices WHERE outstanding > 0 GROUP BY customer ORDER BY customer;
```

Feedback: incorrect-output

```sql
WITH invoices(id, customer, issued_on, due_on, amount) AS ( VALUES (1, 'Acme', '2025-01-05', '2025-02-04', 500), (2, 'Acme', '2025-03-10', '2025-04-09', 400), (3, 'Bolt', '2024-12-01', '2024-12-31', 300), (4, 'Bolt', '2024-12-15', '2025-01-14', 250), (5, 'Cora', '2024-11-10', '2024-12-10', 600), (6, 'Cora', '2025-03-01', '2025-03-31', 150), (7, 'Dune', '2025-02-20', '2025-03-22', 90) ), invoice_payments(invoice_id, paid_on, amount) AS ( VALUES (1, '2025-02-10', 200), (3, '2025-01-15', 300), (4, '2025-04-02', 100), (5, '2025-01-20', 100) ), open_invoices AS (SELECT i.customer, i.amount - COALESCE((SELECT SUM(p.amount) FROM invoice_payments AS p WHERE p.invoice_id = i.id AND p.paid_on <= '2025-03-31'), 0) AS outstanding, CAST(julianday('2025-03-31') - julianday(i.issued_on) AS INTEGER) AS days_overdue FROM invoices AS i) SELECT customer, SUM(CASE WHEN days_overdue <= 0 THEN outstanding ELSE 0 END) AS current_due, SUM(CASE WHEN days_overdue BETWEEN 1 AND 30 THEN outstanding ELSE 0 END) AS d1_30, SUM(CASE WHEN days_overdue BETWEEN 31 AND 60 THEN outstanding ELSE 0 END) AS d31_60, SUM(CASE WHEN days_overdue BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS d61_90, SUM(CASE WHEN days_overdue > 90 THEN outstanding ELSE 0 END) AS over_90, SUM(outstanding) AS total_outstanding FROM open_invoices WHERE outstanding > 0 GROUP BY customer ORDER BY customer;
```
