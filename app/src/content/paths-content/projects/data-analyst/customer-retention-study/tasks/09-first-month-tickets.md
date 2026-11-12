---
id: crs-09-first-month-tickets
title: Support tickets in the first month
order: 9
difficulty: advanced
topic: Customer experience
summary: Link support tickets opened in a customer's first 30 days to whether they were still paying three months later.
module: who-stays
duration: 30
dataset: rasoi-crate
tables:
  - payments
  - customers
  - support_tickets
orderMatters: true
checkColumnNames: true
objectives:
  - Relate early experience to later behaviour
  - Use date arithmetic relative to each customer
prerequisites:
  - date() modifiers
  - LEFT JOIN
  - COALESCE
---

## Task

Operations suspects that a bad first experience drives people away. Using the same customers as Task 6, look at the support tickets each customer opened within **30 days of signing up** (`opened_on <= date(signup_date, '+30 days')`).

Return one row per `first_month_ticket`: the ticket's `category`, or `'no ticket'` for customers without one. For each, return `customers`, `m3_pct` (month-3 retention, one decimal) and `avg_hours_to_resolve` (rounded to one decimal; NULL for `'no ticket'`). Sort by `m3_pct`, lowest first.

No customer opened more than one ticket in their first 30 days.

## Starter query

```sql
SELECT category, COUNT(*) AS tickets, ROUND(AVG(hours_to_resolve), 1) AS avg_hours
FROM support_tickets
GROUP BY category;
```

## Hints

1. Make a CTE of early tickets: join `support_tickets` to `customers` and keep tickets opened within 30 days of `signup_date` with `date(c.signup_date, '+30 days')`.
2. Customers without an early ticket must stay in the result, so `LEFT JOIN` the early tickets to the retention flags.
3. `COALESCE(t.category, 'no ticket')` names the group; `AVG(t.hours_to_resolve)` is NULL automatically for customers without a ticket.

## Solution

```sql
WITH paid AS (
  SELECT DISTINCT customer_id, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
firsts AS (
  SELECT customer_id, MIN(month_no) AS first_no
  FROM paid
  GROUP BY customer_id
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
),
early_tickets AS (
  SELECT t.customer_id, t.category, t.hours_to_resolve
  FROM support_tickets AS t
  JOIN customers AS c ON c.customer_id = t.customer_id
  WHERE t.opened_on <= date(c.signup_date, '+30 days')
)
SELECT COALESCE(t.category, 'no ticket') AS first_month_ticket,
       COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct,
       ROUND(AVG(t.hours_to_resolve), 1) AS avg_hours_to_resolve
FROM flags AS fl
LEFT JOIN early_tickets AS t ON t.customer_id = fl.customer_id
GROUP BY first_month_ticket
ORDER BY m3_pct;
```

## Expected result

| first_month_ticket | customers | m3_pct | avg_hours_to_resolve |
| --- | --- | --- | --- |
| late delivery | 46 | 26.1 | 36.1 |
| billing | 7 | 28.6 | 12.3 |
| no ticket | 194 | 44.8 | NULL |
| missing item | 20 | 55 | 11.2 |
| food quality | 19 | 68.4 | 10.6 |

## Explanation

SQLite's `date(value, '+30 days')` moves a date forward, so the early-ticket window is relative to each customer's own signup. The `LEFT JOIN` keeps the large "no ticket" group as the baseline to compare with.

**What it tells the business:** a **late delivery in the first month is the strongest warning sign in the data**: only 26.1% of those customers are still paying at month 3, against 44.8% of customers with no ticket, and late-delivery tickets took 36.1 hours to resolve on average. A missing item or a food-quality complaint did not hurt (55.0% and 68.4%), probably because those were resolved in about 11 hours. The billing group (28.6%) has only 7 customers, too few to read. Reliable first deliveries are worth more than any discount.

**Common mistake:** an inner join to the tickets. It silently drops every customer without a ticket, so there is no baseline and every category looks bad.

## Wrong answers

Feedback: missing-rows

```sql
WITH paid AS (
  SELECT DISTINCT customer_id, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
firsts AS (
  SELECT customer_id, MIN(month_no) AS first_no
  FROM paid
  GROUP BY customer_id
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
),
early_tickets AS (
  SELECT t.customer_id, t.category, t.hours_to_resolve
  FROM support_tickets AS t JOIN customers AS c ON c.customer_id = t.customer_id
  WHERE t.opened_on <= date(c.signup_date, '+30 days')
)
SELECT COALESCE(t.category, 'no ticket') AS first_month_ticket, COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct, ROUND(AVG(t.hours_to_resolve), 1) AS avg_hours_to_resolve
FROM flags AS fl JOIN early_tickets AS t ON t.customer_id = fl.customer_id
GROUP BY first_month_ticket ORDER BY m3_pct;
```

Feedback: incorrect-output

```sql
WITH paid AS (
  SELECT DISTINCT customer_id, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
firsts AS (
  SELECT customer_id, MIN(month_no) AS first_no
  FROM paid
  GROUP BY customer_id
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT COALESCE(t.category, 'no ticket') AS first_month_ticket, COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct, ROUND(AVG(t.hours_to_resolve), 1) AS avg_hours_to_resolve
FROM flags AS fl LEFT JOIN support_tickets AS t ON t.customer_id = fl.customer_id
GROUP BY first_month_ticket ORDER BY m3_pct;
```
