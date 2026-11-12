---
id: crs-11-churn-reasons
title: Why customers cancel, and when
order: 11
difficulty: intermediate
topic: Churn analysis
summary: Rank cancellation reasons and show how many cancellations of each kind happen within two months of the first payment.
module: revenue-and-churn
duration: 25
dataset: rasoi-crate
tables:
  - cancellations
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Measure time to churn
  - Profile churn reasons by timing
prerequisites:
  - Date text functions
  - Window functions over aggregates
  - Common table expressions
---

## Task

Every cancellation is saved with a reason. For each `reason`, return:

- `cancellations` and `share_pct` (its share of all cancellations, one decimal),
- `early_pct`: the share of that reason's cancellations that happened within the first two months, one decimal. A cancellation is early when the month it was made is at most one month after the customer's first paid month,
- `avg_months_in`: the average number of months from the first paid month to the cancellation, counting the first month as 1, one decimal.

Sort by `cancellations`, most first.

## Starter query

```sql
SELECT reason, COUNT(*) AS cancellations
FROM cancellations
GROUP BY reason
ORDER BY cancellations DESC;
```

## Hints

1. Find each customer's first paid month in a CTE, then join it to `cancellations`.
2. Months in = cancellation month number minus first month number, plus 1. Use the same `year * 12 + month` trick on `cancelled_on` (its first 7 characters are the month).
3. Early means months in is at most 2: `SUM(months_in <= 2)` counts those. The share of all cancellations uses `SUM(COUNT(*)) OVER ()`.

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, MIN(billing_month) AS first_month
  FROM payments
  WHERE status = 'paid'
  GROUP BY customer_id
),
cancelled AS (
  SELECT x.reason,
         (CAST(substr(x.cancelled_on, 1, 4) AS INTEGER) * 12 + CAST(substr(x.cancelled_on, 6, 2) AS INTEGER))
         - (CAST(substr(f.first_month, 1, 4) AS INTEGER) * 12 + CAST(substr(f.first_month, 6, 2) AS INTEGER)) + 1 AS months_in
  FROM cancellations AS x
  JOIN firsts AS f ON f.customer_id = x.customer_id
)
SELECT reason,
       COUNT(*) AS cancellations,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct,
       ROUND(100.0 * SUM(months_in <= 2) / COUNT(*), 1) AS early_pct,
       ROUND(AVG(months_in), 1) AS avg_months_in
FROM cancelled
GROUP BY reason
ORDER BY cancellations DESC;
```

## Expected result

| reason | cancellations | share_pct | early_pct | avg_months_in |
| --- | --- | --- | --- | --- |
| too expensive | 87 | 37.7 | 72.4 | 2.5 |
| not enough time to cook | 42 | 18.2 | 83.3 | 2.4 |
| delivery problems | 30 | 13 | 83.3 | 1.9 |
| payment failed | 30 | 13 | 73.3 | 2.4 |
| moving or travelling | 22 | 9.5 | 54.5 | 3.4 |
| food quality | 20 | 8.7 | 60 | 3.4 |

## Explanation

The same month-number arithmetic measures how long a customer stayed before cancelling. A customer who came back and cancelled again has two cancellations, each measured from their very first month.

**What it tells the business:** **"too expensive" is the top reason (37.7%) and 72.4% of those cancellations come within two months**, when the first full-price bill arrives. Whether the discounted first box causes that price shock is worth testing (Task 8 showed free-box customers leave fastest). "Not enough time to cook" is second (18.2%). **Delivery problems** cause 13.0% of cancellations and come earliest of all (1.9 months in on average, 83.3% within two months). Another 13.0% are involuntary: the card failed and was never replaced, which a payment-reminder flow could recover.

**Common mistake:** measuring time from `signup_date`. Customers who signed up but paid weeks later would look as if they stayed longer than they did.

## Wrong answers

Feedback: incorrect-output

```sql
WITH cancelled AS (
  SELECT x.reason,
         (CAST(substr(x.cancelled_on, 1, 4) AS INTEGER) * 12 + CAST(substr(x.cancelled_on, 6, 2) AS INTEGER))
         - (CAST(substr(c.signup_date, 1, 4) AS INTEGER) * 12 + CAST(substr(c.signup_date, 6, 2) AS INTEGER)) + 1 AS months_in
  FROM cancellations AS x JOIN customers AS c ON c.customer_id = x.customer_id
)
SELECT reason, COUNT(*) AS cancellations, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct,
       ROUND(100.0 * SUM(months_in <= 2) / COUNT(*), 1) AS early_pct, ROUND(AVG(months_in), 1) AS avg_months_in
FROM cancelled GROUP BY reason ORDER BY cancellations DESC;
```

Feedback: incorrect-output

```sql
WITH firsts AS (SELECT customer_id, MIN(billing_month) AS first_month FROM payments WHERE status = 'paid' GROUP BY customer_id),
cancelled AS (
  SELECT x.reason,
         (CAST(substr(x.cancelled_on, 1, 4) AS INTEGER) * 12 + CAST(substr(x.cancelled_on, 6, 2) AS INTEGER))
         - (CAST(substr(f.first_month, 1, 4) AS INTEGER) * 12 + CAST(substr(f.first_month, 6, 2) AS INTEGER)) + 1 AS months_in
  FROM cancellations AS x JOIN firsts AS f ON f.customer_id = x.customer_id
)
SELECT reason, COUNT(*) AS cancellations, ROUND(100.0 * COUNT(*) / COUNT(*), 1) AS share_pct,
       ROUND(100.0 * SUM(months_in <= 2) / COUNT(*), 1) AS early_pct, ROUND(AVG(months_in), 1) AS avg_months_in
FROM cancelled GROUP BY reason ORDER BY cancellations DESC;
```
