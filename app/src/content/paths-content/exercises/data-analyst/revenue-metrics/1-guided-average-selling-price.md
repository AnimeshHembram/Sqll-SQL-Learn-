---
id: da-average-selling-price
title: Average price paid per book
order: 1
difficulty: intermediate
topic: Ratio metrics
summary: Divide revenue by units to find the average price customers actually paid per book.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate a ratio of two totals
---

## Task

Pricing wants the **average selling price**: net revenue divided by the number of books sold, both for non-cancelled orders. Return one row with `units`, `revenue` (rounded to 2 decimal places) and `avg_price_paid` (rounded to 2 decimal places).

**Steps**

1. The starter query already joins orders to their lines and removes cancelled orders.
2. Add `SUM(oi.quantity) AS units` and the revenue sum `SUM(oi.quantity * oi.unit_price)`.
3. Divide the two totals for `avg_price_paid`, and round the money columns.

## Starter query

```sql
SELECT o.id, oi.quantity, oi.unit_price
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. Every column is a total over all the rows, so there is no `GROUP BY`.
2. A ratio of totals divides the totals: `SUM(revenue) / SUM(units)`, not an average of row prices.
3. `ROUND(SUM(oi.quantity * oi.unit_price) / SUM(oi.quantity), 2) AS avg_price_paid`

## Solution

```sql
SELECT SUM(oi.quantity) AS units,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM(oi.quantity * oi.unit_price) / SUM(oi.quantity), 2) AS avg_price_paid
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Expected result

| units | revenue | avg_price_paid |
| --- | --- | --- |
| 10 | 133.46 | 13.35 |

## Explanation

Ten books brought in 133.46, so the average book sold for 13.35. `AVG(oi.unit_price)` would give each order line equal weight, so a line of two books would count the same as a line of one. Dividing the totals weights every book equally, which is what "price per book" means.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT SUM(oi.quantity) AS units, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue, ROUND(AVG(oi.unit_price), 2) AS avg_price_paid FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled';
```
