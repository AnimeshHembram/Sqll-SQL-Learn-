---
id: da-day-206
title: Case study: what a price change did to plans
order: 206
difficulty: advanced
topic: Case studies
summary: Classify each customer's move after a price change and measure the MRR impact of each movement.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Classify customer movements between two snapshots
  - Reconcile MRR change by movement
prerequisites:
  - Day 116
  - Day 137
---

## Task

After a price change, compare each customer's plan **before** and **after** (data in the starter query; plan prices in `plans`). Each customer is exactly one of: `'upgraded'` (moved to a pricier plan), `'downgraded'`, `'stayed'`, `'churned'` (no plan after) or `'new'` (no plan before).

Return one row per movement: `movement`, `customers` and `mrr_change` (after price − before price, summed; churned customers lose their old price, new customers add theirs), plus a final `'net'` row with the total customers counted and the total MRR change. Order: upgraded, downgraded, stayed, churned, new, net.

## Starter query

```sql
WITH plans(plan, monthly_price) AS (
  VALUES ('basic', 10), ('plus', 20), ('pro', 40)
),
before_change(customer, plan) AS (
  VALUES ('c1', 'basic'), ('c2', 'basic'), ('c3', 'plus'), ('c4', 'plus'), ('c5', 'pro'), ('c6', 'pro'), ('c7', 'basic')
),
after_change(customer, plan) AS (
  VALUES ('c1', 'plus'), ('c2', 'basic'), ('c3', 'basic'), ('c4', 'pro'), ('c5', 'pro'), ('c8', 'basic')
)
SELECT b.customer, b.plan AS before_plan, a.plan AS after_plan
FROM before_change AS b
LEFT JOIN after_change AS a ON a.customer = b.customer;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. All customers from either side need a row: `FULL OUTER JOIN after_change AS a ON a.customer = b.customer`, joined to `plans` twice (once for each side's price).
3. Classify with `CASE WHEN b.plan IS NULL THEN 'new' WHEN a.plan IS NULL THEN 'churned' WHEN pa.monthly_price > pb.monthly_price THEN 'upgraded' ...`, treat a missing price as 0, group, and order with a `CASE` that maps each movement to a position.

## Solution

```sql
WITH plans(plan, monthly_price) AS (
  VALUES ('basic', 10), ('plus', 20), ('pro', 40)
),
before_change(customer, plan) AS (
  VALUES ('c1', 'basic'), ('c2', 'basic'), ('c3', 'plus'), ('c4', 'plus'), ('c5', 'pro'), ('c6', 'pro'), ('c7', 'basic')
),
after_change(customer, plan) AS (
  VALUES ('c1', 'plus'), ('c2', 'basic'), ('c3', 'basic'), ('c4', 'pro'), ('c5', 'pro'), ('c8', 'basic')
),
moves AS (
  SELECT COALESCE(b.customer, a.customer) AS customer,
    CASE
      WHEN b.plan IS NULL THEN 'new'
      WHEN a.plan IS NULL THEN 'churned'
      WHEN pa.monthly_price > pb.monthly_price THEN 'upgraded'
      WHEN pa.monthly_price < pb.monthly_price THEN 'downgraded'
      ELSE 'stayed'
    END AS movement,
    COALESCE(pa.monthly_price, 0) - COALESCE(pb.monthly_price, 0) AS mrr_change
  FROM before_change AS b
  FULL OUTER JOIN after_change AS a ON a.customer = b.customer
  LEFT JOIN plans AS pb ON pb.plan = b.plan
  LEFT JOIN plans AS pa ON pa.plan = a.plan
),
report AS (
  SELECT movement, COUNT(*) AS customers, SUM(mrr_change) AS mrr_change FROM moves GROUP BY movement
  UNION ALL
  SELECT 'net', COUNT(*), SUM(mrr_change) FROM moves
)
SELECT movement, customers, mrr_change
FROM report
ORDER BY CASE movement WHEN 'upgraded' THEN 1 WHEN 'downgraded' THEN 2 WHEN 'stayed' THEN 3 WHEN 'churned' THEN 4 WHEN 'new' THEN 5 ELSE 6 END;
```

## Expected result

| movement | customers | mrr_change |
| --- | --- | --- |
| upgraded | 2 | 30 |
| downgraded | 1 | -10 |
| stayed | 2 | 0 |
| churned | 2 | -50 |
| new | 1 | 10 |
| net | 8 | -20 |

## Explanation

A price change moves customers in several directions at once, and only a movement table shows whether the net effect was good. Here two upgrades added 30, one downgrade cost 10, and two churned customers took 50 with them; one new customer added 10. The net change is −20 a month, despite the "successful" upgrades in the headline.

The `FULL OUTER JOIN` is essential: churned customers exist only before and new ones only after, and a one-sided join would drop one of the groups. Treating a missing price as 0 makes the same subtraction work for churn (0 − old price) and new sign-ups (new price − 0), so the net row reconciles exactly with the before and after MRR (150 to 130).

**Common mistake:** a `LEFT JOIN` from before to after, which misses the new customer and overstates the loss.

## Wrong answers

Feedback: incorrect-output

```sql
WITH plans(plan, monthly_price) AS ( VALUES ('basic', 10), ('plus', 20), ('pro', 40) ), before_change(customer, plan) AS ( VALUES ('c1', 'basic'), ('c2', 'basic'), ('c3', 'plus'), ('c4', 'plus'), ('c5', 'pro'), ('c6', 'pro'), ('c7', 'basic') ), after_change(customer, plan) AS ( VALUES ('c1', 'plus'), ('c2', 'basic'), ('c3', 'basic'), ('c4', 'pro'), ('c5', 'pro'), ('c8', 'basic') ), moves AS (SELECT b.customer, CASE WHEN a.plan IS NULL THEN 'churned' WHEN pa.monthly_price > pb.monthly_price THEN 'upgraded' WHEN pa.monthly_price < pb.monthly_price THEN 'downgraded' ELSE 'stayed' END AS movement, COALESCE(pa.monthly_price, 0) - COALESCE(pb.monthly_price, 0) AS mrr_change FROM before_change AS b LEFT JOIN after_change AS a ON a.customer = b.customer LEFT JOIN plans AS pb ON pb.plan = b.plan LEFT JOIN plans AS pa ON pa.plan = a.plan), report AS (SELECT movement, COUNT(*) AS customers, SUM(mrr_change) AS mrr_change FROM moves GROUP BY movement UNION ALL SELECT 'net', COUNT(*), SUM(mrr_change) FROM moves) SELECT movement, customers, mrr_change FROM report ORDER BY CASE movement WHEN 'upgraded' THEN 1 WHEN 'downgraded' THEN 2 WHEN 'stayed' THEN 3 WHEN 'churned' THEN 4 WHEN 'new' THEN 5 ELSE 6 END;
```
