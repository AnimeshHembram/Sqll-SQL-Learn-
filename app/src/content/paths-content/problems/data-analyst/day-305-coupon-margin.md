---
id: da-day-305
title: Do coupons pay for themselves?
order: 305
difficulty: advanced
topic: Marketing analytics
summary: Compare baskets with and without a coupon by customer type, and the margin left after the discount.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Combine parameters with CROSS JOIN
  - Compare margin after discounts
prerequisites:
  - Day 246
  - Day 115
---

## Task

A 15% coupon (starter query terms) is redeemed on some orders. The product margin is 35% of the basket **before** the discount, and the coupon's discount comes out of that margin. For each customer type and coupon use, return:

- `orders` and `avg_basket` (before discount),
- `avg_discount` (15% of the basket for coupon orders, else 0) and `avg_margin` (35% of the basket minus the discount),
- `margin_rate_pct`: average margin ÷ average basket × 100.

Round money to 2 decimal places and the rate to 1. Return `customer_type`, `coupon_used`, `orders`, `avg_basket`, `avg_discount`, `avg_margin` and `margin_rate_pct`, sorted by `customer_type`, then `coupon_used`.

## Starter query

```sql
WITH orders(order_id, customer_type, basket, coupon_used) AS (
  VALUES
    (1, 'new', 1200, 1), (2, 'new', 900, 1), (3, 'new', 1500, 0), (4, 'returning', 2000, 1), (5, 'returning', 1800, 0),
    (6, 'returning', 2200, 1), (7, 'returning', 1600, 0), (8, 'new', 700, 0), (9, 'returning', 2500, 1), (10, 'new', 1100, 1)
),
terms(coupon_pct, margin_pct) AS (
  VALUES (15, 35)
)
SELECT order_id, customer_type, basket, coupon_used
FROM orders
ORDER BY order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `CROSS JOIN terms` brings the percentages onto every order. Discount: `basket * coupon_pct / 100.0 * coupon_used`.
3. Margin per order: `basket * margin_pct / 100.0 - discount`; then group by customer type and coupon use.

## Solution

```sql
WITH orders(order_id, customer_type, basket, coupon_used) AS (
  VALUES
    (1, 'new', 1200, 1), (2, 'new', 900, 1), (3, 'new', 1500, 0), (4, 'returning', 2000, 1), (5, 'returning', 1800, 0),
    (6, 'returning', 2200, 1), (7, 'returning', 1600, 0), (8, 'new', 700, 0), (9, 'returning', 2500, 1), (10, 'new', 1100, 1)
),
terms(coupon_pct, margin_pct) AS (
  VALUES (15, 35)
),
per_order AS (
  SELECT o.customer_type, o.coupon_used, o.basket,
    o.basket * t.coupon_pct / 100.0 * o.coupon_used AS discount,
    o.basket * t.margin_pct / 100.0 - o.basket * t.coupon_pct / 100.0 * o.coupon_used AS margin
  FROM orders AS o
  CROSS JOIN terms AS t
)
SELECT customer_type, coupon_used, COUNT(*) AS orders, ROUND(AVG(basket), 2) AS avg_basket, ROUND(AVG(discount), 2) AS avg_discount,
  ROUND(AVG(margin), 2) AS avg_margin, ROUND(100.0 * AVG(margin) / AVG(basket), 1) AS margin_rate_pct
FROM per_order
GROUP BY customer_type, coupon_used
ORDER BY customer_type, coupon_used;
```

## Expected result

| customer_type | coupon_used | orders | avg_basket | avg_discount | avg_margin | margin_rate_pct |
| --- | --- | --- | --- | --- | --- | --- |
| new | 0 | 2 | 1100 | 0 | 385 | 35 |
| new | 1 | 3 | 1066.67 | 160 | 213.33 | 20 |
| returning | 0 | 2 | 1700 | 0 | 595 | 35 |
| returning | 1 | 3 | 2233.33 | 335 | 446.67 | 20 |

## Explanation

A 15% coupon on a 35% margin product gives away almost half the margin: margin falls from 35% of the basket to 20%. That only pays off if coupons bring orders or basket growth that would not have happened otherwise. Returning customers with coupons do spend more (2,233 against 1,700 without), but each coupon costs them 335 of margin; new customers' coupon baskets are no bigger than those without.

The discount comes out of margin, so the margin is `35% of basket − discount`. `CROSS JOIN terms` makes the coupon and margin percentages available on every order without hard-coding them, so the same query works when the terms change.

**Common mistake:** applying the margin rate to the discounted basket. That spreads the discount across cost and margin, so coupons look much cheaper than they are (29.75% instead of 20%).

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(order_id, customer_type, basket, coupon_used) AS ( VALUES (1, 'new', 1200, 1), (2, 'new', 900, 1), (3, 'new', 1500, 0), (4, 'returning', 2000, 1), (5, 'returning', 1800, 0), (6, 'returning', 2200, 1), (7, 'returning', 1600, 0), (8, 'new', 700, 0), (9, 'returning', 2500, 1), (10, 'new', 1100, 1) ), terms(coupon_pct, margin_pct) AS ( VALUES (15, 35) ), per_order AS (SELECT o.customer_type, o.coupon_used, o.basket, o.basket * t.coupon_pct / 100.0 * o.coupon_used AS discount, (o.basket - o.basket * t.coupon_pct / 100.0 * o.coupon_used) * t.margin_pct / 100.0 AS margin FROM orders AS o CROSS JOIN terms AS t) SELECT customer_type, coupon_used, COUNT(*) AS orders, ROUND(AVG(basket), 2) AS avg_basket, ROUND(AVG(discount), 2) AS avg_discount, ROUND(AVG(margin), 2) AS avg_margin, ROUND(100.0 * AVG(margin) / AVG(basket), 1) AS margin_rate_pct FROM per_order GROUP BY customer_type, coupon_used ORDER BY customer_type, coupon_used;
```
