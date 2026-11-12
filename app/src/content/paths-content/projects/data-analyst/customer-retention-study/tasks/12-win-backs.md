---
id: crs-12-win-backs
title: Customers who came back
order: 12
difficulty: advanced
topic: Gaps and islands
summary: Find customers who stopped paying for at least a month and later returned, and what they paid after coming back.
module: revenue-and-churn
duration: 35
dataset: rasoi-crate
tables:
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Find gaps in activity with LAG (gaps and islands)
  - Keep the first event per customer with ROW_NUMBER
prerequisites:
  - LAG
  - ROW_NUMBER
  - Common table expressions
---

## Task

Some customers cancel and later return. A customer **came back** when there is a gap of at least one unpaid month between two of their paid months.

For every such customer, find their **first** return: the first paid month that follows a gap. Return one row with:

- `won_back_customers`: how many customers came back,
- `avg_months_away`: the average number of unpaid months before that first return, one decimal,
- `revenue_after_return`: everything they paid from their first return month onwards,
- `revenue_per_won_back_customer`: that revenue divided by the number of won-back customers, rounded to a whole rupee.

## Starter query

```sql
SELECT customer_id, billing_month,
       CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
FROM payments
WHERE status = 'paid'
ORDER BY customer_id, month_no
LIMIT 30;
```

## Hints

1. For each paid month, `LAG(month_no) OVER (PARTITION BY customer_id ORDER BY month_no)` gives the customer's previous paid month. The gap is the difference; a gap above 1 means unpaid months in between.
2. Rank the rows with a gap per customer by month (`ROW_NUMBER() ... ORDER BY month_no`) and keep rank 1: the first return. Months away is `gap - 1`.
3. Join the first returns back to the paid months with `p.month_no >= r.return_no` to add up the revenue after returning.

## Solution

```sql
WITH paid AS (
  SELECT customer_id, amount, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
gaps AS (
  SELECT customer_id, month_no,
         month_no - LAG(month_no) OVER (PARTITION BY customer_id ORDER BY month_no) AS gap
  FROM paid
),
returns AS (
  SELECT customer_id, month_no AS return_no, gap - 1 AS months_away,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY month_no) AS return_number
  FROM gaps
  WHERE gap > 1
),
first_returns AS (
  SELECT customer_id, return_no, months_away FROM returns WHERE return_number = 1
)
SELECT COUNT(DISTINCT r.customer_id) AS won_back_customers,
       (SELECT ROUND(AVG(months_away), 1) FROM first_returns) AS avg_months_away,
       SUM(p.amount) AS revenue_after_return,
       ROUND(1.0 * SUM(p.amount) / COUNT(DISTINCT r.customer_id), 0) AS revenue_per_won_back_customer
FROM first_returns AS r
JOIN paid AS p ON p.customer_id = r.customer_id AND p.month_no >= r.return_no;
```

## Expected result

| won_back_customers | avg_months_away | revenue_after_return | revenue_per_won_back_customer |
| --- | --- | --- | --- |
| 25 | 3.7 | 221432 | 8857 |

## Explanation

This is the **gaps-and-islands** pattern: `LAG` compares each paid month with the previous one, and a jump larger than one marks the start of a new "island" of activity. `ROW_NUMBER` keeps only each customer's first return, and the average months away is taken from that one-row-per-customer CTE so the revenue join cannot repeat it.

**What it tells the business:** **25 customers came back** after about 3.7 months away on average, and have paid ₹2,21,432 since returning, around ₹8,857 each. Win-backs are real revenue, which makes the case for a structured win-back email after two or three months instead of letting lapsed customers drift.

**Common mistake:** averaging `months_away` over the joined rows. A customer with ten paid months after returning would count ten times, so long-staying returners distort the average.

## Wrong answers

Feedback: incorrect-output

```sql
WITH paid AS (SELECT customer_id, amount, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no FROM payments WHERE status = 'paid'),
gaps AS (SELECT customer_id, month_no, month_no - LAG(month_no) OVER (PARTITION BY customer_id ORDER BY month_no) AS gap FROM paid),
returns AS (
  SELECT customer_id, month_no AS return_no, gap - 1 AS months_away,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY month_no) AS return_number
  FROM gaps WHERE gap > 1
),
first_returns AS (SELECT customer_id, return_no, months_away FROM returns WHERE return_number = 1)
SELECT COUNT(DISTINCT r.customer_id) AS won_back_customers, ROUND(AVG(r.months_away), 1) AS avg_months_away,
       SUM(p.amount) AS revenue_after_return,
       ROUND(1.0 * SUM(p.amount) / COUNT(DISTINCT r.customer_id), 0) AS revenue_per_won_back_customer
FROM first_returns AS r JOIN paid AS p ON p.customer_id = r.customer_id AND p.month_no >= r.return_no;
```

Feedback: incorrect-output

```sql
WITH paid AS (SELECT customer_id, amount, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no FROM payments WHERE status = 'paid'),
gaps AS (SELECT customer_id, month_no, month_no - LAG(month_no) OVER (PARTITION BY customer_id ORDER BY month_no) AS gap FROM paid),
first_returns AS (SELECT customer_id, MIN(month_no) AS return_no, MIN(gap) - 1 AS months_away FROM gaps WHERE gap >= 1 GROUP BY customer_id)
SELECT COUNT(DISTINCT r.customer_id) AS won_back_customers, (SELECT ROUND(AVG(months_away), 1) FROM first_returns) AS avg_months_away,
       SUM(p.amount) AS revenue_after_return,
       ROUND(1.0 * SUM(p.amount) / COUNT(DISTINCT r.customer_id), 0) AS revenue_per_won_back_customer
FROM first_returns AS r JOIN paid AS p ON p.customer_id = r.customer_id AND p.month_no >= r.return_no;
```
