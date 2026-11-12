---
id: crs-01-monthly-revenue
title: Monthly paying customers and revenue
order: 1
difficulty: beginner
topic: Subscription KPIs
summary: Count paying customers and revenue in every billing month, without counting failed payment attempts.
module: know-the-data
duration: 15
dataset: rasoi-crate
tables:
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Filter transactions to the ones that count
  - Count distinct customers per period
prerequisites:
  - WHERE
  - GROUP BY
  - COUNT(DISTINCT)
---

## Task

Rasoi Crate bills each subscriber once a month. When a card is declined, the attempt is saved as `'failed'` and the payment is often retried and `'paid'` later in the same month.

For each `billing_month` (call it `month`), return `paying_customers` (customers with a **paid** payment that month) and `revenue` (the sum of paid amounts). Sort by `month`.

## Starter query

```sql
SELECT billing_month AS month, COUNT(*) AS payments, SUM(amount) AS amount
FROM payments
GROUP BY billing_month
ORDER BY month;
```

## Hints

1. Only `status = 'paid'` rows are money that arrived. Filter before grouping.
2. A customer could in principle have more than one paid row in a month, so count people with `COUNT(DISTINCT customer_id)`, not rows.
3. Group by `billing_month`, rename it with `AS month`, and sort by it.

## Solution

```sql
SELECT billing_month AS month,
       COUNT(DISTINCT customer_id) AS paying_customers,
       SUM(amount) AS revenue
FROM payments
WHERE status = 'paid'
GROUP BY billing_month
ORDER BY month;
```

## Expected result

| month | paying_customers | revenue |
| --- | --- | --- |
| 2024-01 | 12 | 22392 |
| 2024-02 | 15 | 33686 |
| 2024-03 | 32 | 72122 |
| 2024-04 | 36 | 95517 |
| 2024-05 | 49 | 137101 |
| 2024-06 | 49 | 140253 |
| 2024-07 | 62 | 173340 |
| 2024-08 | 71 | 195081 |
| 2024-09 | 71 | 210430 |
| 2024-10 | 92 | 253415 |
| 2024-11 | 122 | 297550 |
| 2024-12 | 114 | 344591 |
| 2025-01 | 117 | 367736 |
| 2025-02 | 116 | 364488 |
| 2025-03 | 130 | 406472 |
| 2025-04 | 142 | 430112 |
| 2025-05 | 139 | 419666 |
| 2025-06 | 146 | 436657 |

## Explanation

Filtering on `status = 'paid'` removes failed attempts, which would otherwise count a retried customer twice and add money that never arrived.

**What it tells the business:** paying customers grew from 12 in January 2024 to 146 in June 2025, and monthly revenue from ₹22,392 to ₹4,36,657. The jump in November 2024 (92 → 122 customers) is the Diwali "free first box" campaign, and December fell back to 114: an early hint that many of those customers did not stay. Growth looks healthy on the surface; the rest of the project asks whether it is built on customers who stay.

**Common mistake:** counting every row in `payments`. Failed attempts are billing events, not customers or revenue.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT billing_month AS month, COUNT(*) AS paying_customers, SUM(amount) AS revenue
FROM payments
GROUP BY billing_month
ORDER BY month;
```

Feedback: wrong-order

```sql
SELECT billing_month AS month, COUNT(DISTINCT customer_id) AS paying_customers, SUM(amount) AS revenue
FROM payments
WHERE status = 'paid'
GROUP BY billing_month
ORDER BY revenue DESC;
```
