---
id: da-day-116
title: Case study: monthly recurring revenue movements
order: 116
difficulty: advanced
topic: Case studies
summary: Explain each month's MRR change as new, expansion, contraction and churn.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Explain a change in a total by its components
  - Compare each entity with itself in the previous period
prerequisites:
  - Day 44
  - Day 51
---

## Task

A subscription business tracks **monthly recurring revenue (MRR)** per customer (in the starter query). For each month **after the first**, explain the change from the previous month:

- `new_mrr`: MRR of customers who had none the month before,
- `expansion_mrr`: increases from existing customers,
- `contraction_mrr`: decreases from customers who are still paying (a negative number),
- `churned_mrr`: last month's MRR of customers who stopped paying (a negative number),
- `net_change`: the sum of the four.

Return `month` and those five columns. Sort by `month`.

## Starter query

```sql
WITH mrr(customer, month, amount) AS (
  VALUES
    ('A', '2025-01', 100), ('B', '2025-01', 50), ('C', '2025-01', 80), ('D', '2025-01', 30),
    ('A', '2025-02', 120), ('B', '2025-02', 50), ('C', '2025-02', 60), ('E', '2025-02', 40),
    ('A', '2025-03', 120), ('C', '2025-03', 90), ('E', '2025-03', 40), ('F', '2025-03', 70)
)
SELECT month, SUM(amount) AS total_mrr
FROM mrr
GROUP BY month
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The starter query shows the total MRR per month; your columns must explain the differences between those totals.
2. Build one row per month (after the first) and customer with `now_mrr` and `prev_mrr`. Last month is `strftime('%Y-%m', month || '-01', '-1 month')`; a customer missing in a month has `NULL` there.
3. Classify with `SUM(CASE ...)`: new when `prev_mrr IS NULL AND now_mrr IS NOT NULL`; expansion when `now_mrr > prev_mrr`; contraction when `now_mrr < prev_mrr`; churn when `prev_mrr IS NOT NULL AND now_mrr IS NULL` (as `-prev_mrr`).

## Solution

```sql
WITH mrr(customer, month, amount) AS (
  VALUES
    ('A', '2025-01', 100), ('B', '2025-01', 50), ('C', '2025-01', 80), ('D', '2025-01', 30),
    ('A', '2025-02', 120), ('B', '2025-02', 50), ('C', '2025-02', 60), ('E', '2025-02', 40),
    ('A', '2025-03', 120), ('C', '2025-03', 90), ('E', '2025-03', 40), ('F', '2025-03', 70)
),
months AS (
  SELECT DISTINCT month FROM mrr
  WHERE month > (SELECT MIN(month) FROM mrr)
),
customers AS (
  SELECT DISTINCT customer FROM mrr
),
movements AS (
  SELECT m.month, c.customer,
    (SELECT amount FROM mrr AS x WHERE x.customer = c.customer AND x.month = m.month) AS now_mrr,
    (SELECT amount FROM mrr AS x WHERE x.customer = c.customer
       AND x.month = strftime('%Y-%m', m.month || '-01', '-1 month')) AS prev_mrr
  FROM months AS m
  CROSS JOIN customers AS c
),
classified AS (
  SELECT month,
    SUM(CASE WHEN prev_mrr IS NULL AND now_mrr IS NOT NULL THEN now_mrr ELSE 0 END) AS new_mrr,
    SUM(CASE WHEN now_mrr > prev_mrr THEN now_mrr - prev_mrr ELSE 0 END) AS expansion_mrr,
    SUM(CASE WHEN now_mrr < prev_mrr THEN now_mrr - prev_mrr ELSE 0 END) AS contraction_mrr,
    SUM(CASE WHEN prev_mrr IS NOT NULL AND now_mrr IS NULL THEN -prev_mrr ELSE 0 END) AS churned_mrr
  FROM movements
  GROUP BY month
)
SELECT month, new_mrr, expansion_mrr, contraction_mrr, churned_mrr,
  new_mrr + expansion_mrr + contraction_mrr + churned_mrr AS net_change
FROM classified
ORDER BY month;
```

## Expected result

| month | new_mrr | expansion_mrr | contraction_mrr | churned_mrr | net_change |
| --- | --- | --- | --- | --- | --- |
| 2025-02 | 40 | 20 | -20 | -30 | 10 |
| 2025-03 | 70 | 30 | 0 | -50 | 50 |

## Explanation

An MRR bridge is one of the most common SaaS reports. The trick is to compare each customer with themselves a month earlier, including customers who appear in only one of the two months. Pairing every month with every customer (`CROSS JOIN`) and looking up both amounts gives `NULL` where a customer was absent, which is exactly what distinguishes new and churned customers from existing ones.

February: E is new (+40), A expanded (+20), C contracted (−20) and D churned (−30), a net change of +10, matching the total going from 260 to 270. March's net +50 matches 270 to 320. **Always check that the bridge adds up to the change in the total;** if it does not, a customer has been missed or counted twice.

**Common mistake:** joining only customers present in the current month, which silently loses every churned customer.

## Wrong answers

Feedback: incorrect-output

```sql
WITH mrr(customer, month, amount) AS ( VALUES ('A', '2025-01', 100), ('B', '2025-01', 50), ('C', '2025-01', 80), ('D', '2025-01', 30), ('A', '2025-02', 120), ('B', '2025-02', 50), ('C', '2025-02', 60), ('E', '2025-02', 40), ('A', '2025-03', 120), ('C', '2025-03', 90), ('E', '2025-03', 40), ('F', '2025-03', 70) ), movements AS (SELECT cur.month, cur.customer, cur.amount AS now_mrr, prev.amount AS prev_mrr FROM mrr AS cur LEFT JOIN mrr AS prev ON prev.customer = cur.customer AND prev.month = strftime('%Y-%m', cur.month || '-01', '-1 month') WHERE cur.month > (SELECT MIN(month) FROM mrr)), classified AS (SELECT month, SUM(CASE WHEN prev_mrr IS NULL AND now_mrr IS NOT NULL THEN now_mrr ELSE 0 END) AS new_mrr, SUM(CASE WHEN now_mrr > prev_mrr THEN now_mrr - prev_mrr ELSE 0 END) AS expansion_mrr, SUM(CASE WHEN now_mrr < prev_mrr THEN now_mrr - prev_mrr ELSE 0 END) AS contraction_mrr, SUM(CASE WHEN prev_mrr IS NOT NULL AND now_mrr IS NULL THEN -prev_mrr ELSE 0 END) AS churned_mrr FROM movements GROUP BY month) SELECT month, new_mrr, expansion_mrr, contraction_mrr, churned_mrr, new_mrr + expansion_mrr + contraction_mrr + churned_mrr AS net_change FROM classified ORDER BY month;
```
