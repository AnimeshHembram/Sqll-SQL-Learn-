---
id: da-day-244
title: Did the win-back email bring lapsed customers back?
order: 244
difficulty: advanced
topic: Customer analytics
summary: Compare 30-day reactivation and revenue between emailed customers and a holdout group.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure an effect against a holdout
  - Restrict events to a time window in the join
prerequisites:
  - Day 112
  - Day 194
---

## Task

Lapsed customers were split into an `email` group and a `holdout` group that was not emailed (starter query, all on 1 March 2025). A customer **reactivated** if they ordered within 30 days **after** the email date (from 2 March to 31 March inclusive); orders outside that window do not count.

For each group, return `grp`, `customers`, `reactivated`, `reactivation_pct` (rounded to 1 decimal place) and `revenue_per_customer` (window revenue ÷ all customers in the group, rounded to 2 decimal places). Then add a final row `grp` = `'lift'` with the email group's reactivation rate minus the holdout's in `reactivation_pct` and `NULL` in the other columns. Sort with `email` first, `holdout` second and `lift` last.

## Starter query

```sql
WITH lapsed(customer, grp, emailed_on) AS (
  VALUES
    ('c1', 'email', '2025-03-01'), ('c2', 'email', '2025-03-01'), ('c3', 'email', '2025-03-01'), ('c4', 'email', '2025-03-01'),
    ('c5', 'email', '2025-03-01'), ('c6', 'email', '2025-03-01'),
    ('c7', 'holdout', '2025-03-01'), ('c8', 'holdout', '2025-03-01'), ('c9', 'holdout', '2025-03-01'), ('c10', 'holdout', '2025-03-01')
),
orders(customer, ordered_on, amount) AS (
  VALUES
    ('c1', '2025-03-04', 900), ('c1', '2025-03-20', 400), ('c2', '2025-02-27', 500), ('c3', '2025-04-15', 700),
    ('c4', '2025-03-31', 600), ('c5', '2025-03-10', 300), ('c8', '2025-03-12', 800), ('c9', '2025-04-02', 450)
)
SELECT l.customer, l.grp, o.ordered_on, o.amount
FROM lapsed AS l
LEFT JOIN orders AS o ON o.customer = l.customer
ORDER BY l.customer;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per customer, sum orders in the window with a `LEFT JOIN` whose condition holds the dates: `o.ordered_on > l.emailed_on AND o.ordered_on <= date(l.emailed_on, '+30 days')`. A customer reactivated if they have at least one such order.
3. Group by `grp`, then add the lift row with `UNION ALL`, computing the difference of the two rates from the grouped CTE. Sort with a `CASE` that puts `'lift'` last.

## Solution

```sql
WITH lapsed(customer, grp, emailed_on) AS (
  VALUES
    ('c1', 'email', '2025-03-01'), ('c2', 'email', '2025-03-01'), ('c3', 'email', '2025-03-01'), ('c4', 'email', '2025-03-01'),
    ('c5', 'email', '2025-03-01'), ('c6', 'email', '2025-03-01'),
    ('c7', 'holdout', '2025-03-01'), ('c8', 'holdout', '2025-03-01'), ('c9', 'holdout', '2025-03-01'), ('c10', 'holdout', '2025-03-01')
),
orders(customer, ordered_on, amount) AS (
  VALUES
    ('c1', '2025-03-04', 900), ('c1', '2025-03-20', 400), ('c2', '2025-02-27', 500), ('c3', '2025-04-15', 700),
    ('c4', '2025-03-31', 600), ('c5', '2025-03-10', 300), ('c8', '2025-03-12', 800), ('c9', '2025-04-02', 450)
),
per_customer AS (
  SELECT l.customer, l.grp, COUNT(o.customer) AS window_orders, COALESCE(SUM(o.amount), 0) AS window_revenue
  FROM lapsed AS l
  LEFT JOIN orders AS o ON o.customer = l.customer
    AND o.ordered_on > l.emailed_on AND o.ordered_on <= date(l.emailed_on, '+30 days')
  GROUP BY l.customer, l.grp
),
groups AS (
  SELECT grp, COUNT(*) AS customers, SUM(window_orders > 0) AS reactivated,
    100.0 * SUM(window_orders > 0) / COUNT(*) AS rate,
    1.0 * SUM(window_revenue) / COUNT(*) AS revenue_per_customer
  FROM per_customer
  GROUP BY grp
),
report AS (
  SELECT 1 AS sort_key, grp, customers, reactivated, rate, revenue_per_customer FROM groups WHERE grp = 'email'
  UNION ALL
  SELECT 2, grp, customers, reactivated, rate, revenue_per_customer FROM groups WHERE grp = 'holdout'
  UNION ALL
  SELECT 3, 'lift', NULL, NULL,
    (SELECT rate FROM groups WHERE grp = 'email') - (SELECT rate FROM groups WHERE grp = 'holdout'), NULL
)
SELECT grp, customers, reactivated, ROUND(rate, 1) AS reactivation_pct, ROUND(revenue_per_customer, 2) AS revenue_per_customer
FROM report
ORDER BY sort_key;
```

## Expected result

| grp | customers | reactivated | reactivation_pct | revenue_per_customer |
| --- | --- | --- | --- | --- |
| email | 6 | 3 | 50 | 366.67 |
| holdout | 4 | 1 | 25 | 200 |
| lift | NULL | NULL | 25 | NULL |

## Explanation

A holdout group is what makes a campaign result believable: some lapsed customers come back anyway. Here half of the emailed customers reactivated within 30 days, but so did a quarter of the holdout, so the email's real effect is the **difference**, 25 percentage points, not 50%.

The window belongs in the join condition. c2 ordered two days before the email and c3 six weeks after it; neither counts as a response, while c4's order on 31 March is the last day inside the window and does. Because the dates sit in the `LEFT JOIN` rather than in `WHERE`, every customer stays in their group with zero window orders, so the denominators remain 6 and 4.

**Common mistake:** counting every order, with no time window. c2's earlier order and c3's late one become "responses", and the email group looks like it reactivated 83% of customers.

## Wrong answers

Feedback: incorrect-output

```sql
WITH lapsed(customer, grp, emailed_on) AS ( VALUES ('c1', 'email', '2025-03-01'), ('c2', 'email', '2025-03-01'), ('c3', 'email', '2025-03-01'), ('c4', 'email', '2025-03-01'), ('c5', 'email', '2025-03-01'), ('c6', 'email', '2025-03-01'), ('c7', 'holdout', '2025-03-01'), ('c8', 'holdout', '2025-03-01'), ('c9', 'holdout', '2025-03-01'), ('c10', 'holdout', '2025-03-01') ), orders(customer, ordered_on, amount) AS ( VALUES ('c1', '2025-03-04', 900), ('c1', '2025-03-20', 400), ('c2', '2025-02-27', 500), ('c3', '2025-04-15', 700), ('c4', '2025-03-31', 600), ('c5', '2025-03-10', 300), ('c8', '2025-03-12', 800), ('c9', '2025-04-02', 450) ), per_customer AS (SELECT l.customer, l.grp, COUNT(o.customer) AS window_orders, COALESCE(SUM(o.amount), 0) AS window_revenue FROM lapsed AS l LEFT JOIN orders AS o ON o.customer = l.customer GROUP BY l.customer, l.grp), groups AS (SELECT grp, COUNT(*) AS customers, SUM(window_orders > 0) AS reactivated, 100.0 * SUM(window_orders > 0) / COUNT(*) AS rate, 1.0 * SUM(window_revenue) / COUNT(*) AS revenue_per_customer FROM per_customer GROUP BY grp), report AS (SELECT 1 AS sort_key, grp, customers, reactivated, rate, revenue_per_customer FROM groups WHERE grp = 'email' UNION ALL SELECT 2, grp, customers, reactivated, rate, revenue_per_customer FROM groups WHERE grp = 'holdout' UNION ALL SELECT 3, 'lift', NULL, NULL, (SELECT rate FROM groups WHERE grp = 'email') - (SELECT rate FROM groups WHERE grp = 'holdout'), NULL) SELECT grp, customers, reactivated, ROUND(rate, 1) AS reactivation_pct, ROUND(revenue_per_customer, 2) AS revenue_per_customer FROM report ORDER BY sort_key;
```
