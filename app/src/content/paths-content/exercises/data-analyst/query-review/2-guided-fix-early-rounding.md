---
id: da-fix-early-rounding
title: Fix revenue that is rounded too early
order: 2
difficulty: intermediate
topic: Rounding
summary: Find why a converted revenue total disagrees with finance, and round only once.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Round once, after aggregating
---

## Task

For an overseas partner, finance reports net revenue converted to US dollars at **0.012 dollars per unit of the store's currency**, rounded to cents. This report (the starter query) disagrees with finance because it converts and rounds every order line before adding them up. Fix it so that the total is converted first and rounded **once**, to 2 decimal places. Keep the single column `revenue_usd`.

**Steps**

1. Run the starter query and note its result.
2. `ROUND` inside `SUM` rounds each of the eight lines to cents, and the rounding errors add up.
3. Move `ROUND` outside the sum: `ROUND(SUM(oi.quantity * oi.unit_price * 0.012), 2)`.

## Starter query

```sql
SELECT SUM(ROUND(oi.quantity * oi.unit_price * 0.012, 2)) AS revenue_usd
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. Compare `SUM(ROUND(x, 2))` with `ROUND(SUM(x), 2)`.
2. The join and the filter are correct; only the position of `ROUND` is wrong.
3. `SELECT ROUND(SUM(oi.quantity * oi.unit_price * 0.012), 2) AS revenue_usd ...`

## Solution

```sql
SELECT ROUND(SUM(oi.quantity * oi.unit_price * 0.012), 2) AS revenue_usd
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Expected result

| revenue_usd |
| --- |
| 1.6 |

## Explanation

Converted and rounded once, revenue is 1.60 dollars. Rounding each line first gives 1.62, more than 1% too high, because most lines were rounded up. When the values being rounded are small, early rounding errors are large compared with the total. Round at the end, unless a business rule (for example, tax charged on each invoice line) says otherwise.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT SUM(ROUND(oi.quantity * oi.unit_price * 0.012, 2)) AS revenue_usd FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled';
```
