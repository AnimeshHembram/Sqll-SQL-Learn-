---
id: da-day-300
title: Case study: does spend grow with customer tenure?
order: 300
difficulty: advanced
topic: Case studies
summary: Band bookstore customers by how long they had been customers on 31 March 2025 and compare their spend.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Band customers by tenure
  - Compare value across tenure bands
prerequisites:
  - Day 240
  - Day 219
---

## Task

Day 300. Management asks whether longer-standing customers are worth more. Using the bookstore tables, measure each customer's **tenure** on **2025-03-31** in completed months since `joined` (a customer who has not joined yet by that date is left out), and band it: `'0-5 months'`, `'6-11 months'` and `'12+ months'`.

For each band, return `tenure_band`, `customers`, `buyers` (customers with at least one non-cancelled order), `orders` (non-cancelled), `revenue` and `revenue_per_customer` (over all customers in the band). Round money to 2 decimal places. Sort from the shortest band to the longest; include every band that has customers.

## Starter query

```sql
SELECT id, name, joined
FROM customers
ORDER BY joined;
```

## Hints

1. Spend and orders per customer first, from `customers` with `LEFT JOIN`s, counting only non-cancelled orders (`CASE WHEN o.status <> 'cancelled' ...` inside `SUM` and `COUNT(DISTINCT ...)`).
2. Completed months to 31 March: `(2025 * 12 + 3) - (year * 12 + month of joined)`; the cut-off is a month end, so no day-of-month adjustment is needed. Leave out customers who joined after 31 March.
3. Band with `CASE` and a numeric order, then group: `SUM(orders > 0)` buyers, `SUM(spent) / COUNT(*)` per customer.

## Solution

```sql
WITH spend AS (
  SELECT c.id, c.name, c.joined,
    COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.quantity * oi.unit_price END), 0) AS spent,
    COUNT(DISTINCT CASE WHEN o.status <> 'cancelled' THEN o.id END) AS orders
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id
  LEFT JOIN order_items AS oi ON oi.order_id = o.id
  GROUP BY c.id, c.name, c.joined
),
tenure AS (
  SELECT spent, orders,
    (2025 * 12 + 3) - (CAST(strftime('%Y', joined) AS INTEGER) * 12 + CAST(strftime('%m', joined) AS INTEGER)) AS months
  FROM spend
  WHERE joined <= '2025-03-31'
),
banded AS (
  SELECT spent, orders, CASE WHEN months >= 12 THEN 3 WHEN months >= 6 THEN 2 ELSE 1 END AS band FROM tenure
)
SELECT CASE band WHEN 1 THEN '0-5 months' WHEN 2 THEN '6-11 months' ELSE '12+ months' END AS tenure_band,
  COUNT(*) AS customers, SUM(orders > 0) AS buyers, SUM(orders) AS orders, ROUND(SUM(spent), 2) AS revenue,
  ROUND(SUM(spent) / COUNT(*), 2) AS revenue_per_customer
FROM banded
GROUP BY band
ORDER BY band;
```

## Expected result

| tenure_band | customers | buyers | orders | revenue | revenue_per_customer |
| --- | --- | --- | --- | --- | --- |
| 0-5 months | 1 | 1 | 1 | 45.75 | 45.75 |
| 6-11 months | 1 | 0 | 0 | 0 | 0 |
| 12+ months | 2 | 2 | 4 | 87.71 | 43.86 |

## Explanation

Tenure bands compare customers by how long they have been with the business. The two customers of a year or more are both buyers and bring in 87.71 together, 43.86 each, while Sofia (10 months) has bought nothing that counted: her only order was cancelled. Daniel, a customer for just one month, already spends more than the average long-standing customer.

The spend is computed per customer from `customers` with `LEFT JOIN`s, so customers with no orders, or only cancelled ones, stay in their band with 0 and count in the per-customer average. Meera joined in June 2025, after the review date, so she is left out entirely. With four customers this is an illustration of the method, not evidence about loyalty.

**Common mistake:** counting cancelled orders. Sofia then appears to have spent 12.99, and the 6-11 month band shows revenue it never earned.

## Wrong answers

Feedback: incorrect-output

```sql
WITH spend AS (SELECT c.id, c.name, c.joined, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS spent, COUNT(DISTINCT o.id) AS orders FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_items AS oi ON oi.order_id = o.id GROUP BY c.id, c.name, c.joined), tenure AS (SELECT spent, orders, (2025 * 12 + 3) - (CAST(strftime('%Y', joined) AS INTEGER) * 12 + CAST(strftime('%m', joined) AS INTEGER)) AS months FROM spend WHERE joined <= '2025-03-31'), banded AS (SELECT spent, orders, CASE WHEN months >= 12 THEN 3 WHEN months >= 6 THEN 2 ELSE 1 END AS band FROM tenure) SELECT CASE band WHEN 1 THEN '0-5 months' WHEN 2 THEN '6-11 months' ELSE '12+ months' END AS tenure_band, COUNT(*) AS customers, SUM(orders > 0) AS buyers, SUM(orders) AS orders, ROUND(SUM(spent), 2) AS revenue, ROUND(SUM(spent) / COUNT(*), 2) AS revenue_per_customer FROM banded GROUP BY band ORDER BY band;
```
