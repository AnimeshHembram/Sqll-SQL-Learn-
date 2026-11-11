---
id: da-day-196
title: Late-arriving customers and the Unknown member
order: 196
difficulty: intermediate
topic: Data engineering
summary: Map facts whose dimension row has not arrived yet to an Unknown member so totals never lose revenue.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Map unmatched facts to an Unknown member
  - Reconcile segment totals against the fact table
prerequisites:
  - Day 70
  - Day 160
---

## Task

In the warehouse (starter query), `fact_sales` stores the source `customer_id` and `dim_customer` maps it to a `customer_key` and segment. Some sales reference customers whose dimension row has not arrived yet, and one has no customer at all. The model has an **Unknown member** (`customer_key = -1`) for exactly this.

Report revenue by segment with every sale counted once: sales whose customer is missing from the dimension, or `NULL`, go to the Unknown member. Return `segment`, `sales` and `revenue`, plus a check row `'All'` with the totals. Sort by revenue from highest to lowest, with `'All'` last.

## Starter query

```sql
WITH dim_customer(customer_key, customer_id, segment) AS (
  VALUES (-1, NULL, 'Unknown'), (1, 'C100', 'Retail'), (2, 'C200', 'Business'), (3, 'C300', 'Retail')
),
fact_sales(sale_id, customer_id, amount) AS (
  VALUES (1, 'C100', 50), (2, 'C200', 120), (3, 'C999', 80), (4, 'C300', 30), (5, NULL, 20), (6, 'C100', 25), (7, 'C888', 15)
)
SELECT f.sale_id, f.customer_id, d.customer_key, d.segment, f.amount
FROM fact_sales AS f
LEFT JOIN dim_customer AS d ON d.customer_id = f.customer_id
ORDER BY f.sale_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEFT JOIN dim_customer AS d ON d.customer_id = f.customer_id`, then map a missing match to the Unknown member: `COALESCE(d.customer_key, -1)`.
3. Join that key back to `dim_customer` to get the segment (so Unknown comes from the dimension, not from a string typed in the query), group, and add the `'All'` row with `UNION ALL`.

## Solution

```sql
WITH dim_customer(customer_key, customer_id, segment) AS (
  VALUES (-1, NULL, 'Unknown'), (1, 'C100', 'Retail'), (2, 'C200', 'Business'), (3, 'C300', 'Retail')
),
fact_sales(sale_id, customer_id, amount) AS (
  VALUES (1, 'C100', 50), (2, 'C200', 120), (3, 'C999', 80), (4, 'C300', 30), (5, NULL, 20), (6, 'C100', 25), (7, 'C888', 15)
),
keyed AS (
  SELECT f.sale_id, f.amount, COALESCE(d.customer_key, -1) AS customer_key
  FROM fact_sales AS f
  LEFT JOIN dim_customer AS d ON d.customer_id = f.customer_id
),
by_segment AS (
  SELECT dc.segment, COUNT(*) AS sales, SUM(k.amount) AS revenue
  FROM keyed AS k
  JOIN dim_customer AS dc ON dc.customer_key = k.customer_key
  GROUP BY dc.segment
),
report AS (
  SELECT segment, sales, revenue FROM by_segment
  UNION ALL
  SELECT 'All', COUNT(*), SUM(amount) FROM fact_sales
)
SELECT segment, sales, revenue
FROM report
ORDER BY segment = 'All', revenue DESC;
```

## Expected result

| segment | sales | revenue |
| --- | --- | --- |
| Business | 1 | 120 |
| Unknown | 3 | 115 |
| Retail | 3 | 105 |
| All | 7 | 340 |

## Explanation

Facts often arrive before their dimension rows: an order is recorded seconds after sign-up, but the customer feed lands overnight. An inner join would silently drop those sales, so revenue by segment would no longer add up to total revenue. Mapping them to an Unknown member keeps every sale visible and makes the gap measurable (115 of 340 here, a sign the customer feed is behind).

The `'All'` row is a reconciliation check computed straight from the fact table: the segments must add up to it. A `NULL` customer (sale 5) does not match anything in a join (`NULL = NULL` is not true), so it falls to Unknown as well.

**Common mistake:** an inner join to the dimension, which reports 225 in total and hides three sales.

## Wrong answers

Feedback: incorrect-output

```sql
WITH dim_customer(customer_key, customer_id, segment) AS ( VALUES (-1, NULL, 'Unknown'), (1, 'C100', 'Retail'), (2, 'C200', 'Business'), (3, 'C300', 'Retail') ), fact_sales(sale_id, customer_id, amount) AS ( VALUES (1, 'C100', 50), (2, 'C200', 120), (3, 'C999', 80), (4, 'C300', 30), (5, NULL, 20), (6, 'C100', 25), (7, 'C888', 15) ), by_segment AS (SELECT d.segment, COUNT(*) AS sales, SUM(f.amount) AS revenue FROM fact_sales AS f JOIN dim_customer AS d ON d.customer_id = f.customer_id GROUP BY d.segment), report AS (SELECT segment, sales, revenue FROM by_segment UNION ALL SELECT 'All', SUM(sales), SUM(revenue) FROM by_segment) SELECT segment, sales, revenue FROM report ORDER BY segment = 'All', revenue DESC;
```
