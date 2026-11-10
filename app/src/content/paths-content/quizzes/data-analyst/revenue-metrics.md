---
id: revenue-metrics
title: Revenue and order metrics
order: 6
difficulty: intermediate
topic: Revenue, orders, AOV and growth
summary: Check that you can define sales metrics and calculate them without double counting.
duration: 4
---

## After `FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id`, which expression counts orders correctly?

Type: multiple-choice
Topic: Counting after a join
Difficulty: intermediate

- [ ] `COUNT(*)`
- [ ] `COUNT(oi.order_id)`
- [x] `COUNT(DISTINCT o.id)`
- [ ] `SUM(o.id)`

### Explanation

The join produces one row per order line, so an order with two books appears twice. `COUNT(*)` and `COUNT(oi.order_id)` count lines. `COUNT(DISTINCT o.id)` counts each order once.

## Which expression calculates average order value?

Type: multiple-choice
Topic: Average order value
Difficulty: intermediate

- [ ] `AVG(oi.quantity * oi.unit_price)`
- [x] `SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id)`
- [ ] `AVG(oi.unit_price)`
- [ ] `SUM(oi.quantity) / COUNT(DISTINCT o.id)`

### Explanation

Average order value is revenue divided by the number of orders. `AVG(quantity * unit_price)` averages order lines, `AVG(unit_price)` averages prices, and `SUM(quantity) / COUNT(DISTINCT o.id)` is books per order.

## Why should revenue be calculated from `order_items.unit_price` rather than `books.price`?

Type: conceptual
Topic: Metric definitions
Difficulty: beginner

- [ ] `books.price` cannot be multiplied
- [x] `unit_price` is the price actually paid; `books.price` is today's price and may have changed since
- [ ] `order_items` is a smaller table, so it is faster
- [ ] They always hold the same value, so it does not matter

### Explanation

Prices change. If revenue used today's list price, a price change would silently rewrite past revenue. The price stored with each order line records what the customer paid.

## February revenue was 29.25 and March revenue was 55.74. What does this expression return, rounded to 1 decimal place?

Type: predict-output
Topic: Growth
Difficulty: intermediate

```sql
SELECT ROUND(100.0 * (55.74 - 29.25) / 29.25, 1) AS growth_pct;
```

- [ ] 47.5
- [x] 90.6
- [ ] 190.6
- [ ] 26.5

### Explanation

Growth is (new − old) ÷ old × 100: 26.49 ÷ 29.25 × 100 = 90.6. Dividing by the new value instead would give 47.5, and forgetting to subtract would give 190.6.

## A dashboard shows "Revenue: 146.45" and a report shows "Revenue: 133.46" for the same orders. What is the most likely explanation?

Type: conceptual
Topic: Gross and net
Difficulty: beginner

- [ ] One of the queries has a syntax error
- [ ] SQLite rounds differently on each run
- [x] One includes cancelled orders (gross) and the other excludes them (net)
- [ ] One counts orders and the other counts books

### Explanation

Both numbers can be correct for their own definition. The difference, 12.99, is exactly the cancelled order. This is why every metric needs a written definition that states its exclusions.
