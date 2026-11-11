---
id: da-day-138
title: Support, confidence and lift for product pairs
order: 138
difficulty: advanced
topic: Behavioural analytics
summary: Turn co-purchase counts into association rules and judge them with lift.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute support, confidence and lift
  - Self-join to build pairs within a basket
prerequisites:
  - Day 78
  - Day 99
---

## Task

A grocer's baskets are in the starter query; one order can list the same item twice. Build **association rules** "customers who buy `antecedent` also buy `consequent`" for every ordered pair of different items bought together in **at least 2 orders**. Return:

- `antecedent`, `consequent`,
- `support_pct`: orders containing both, as a percentage of all orders,
- `confidence_pct`: orders containing both, as a percentage of orders containing the antecedent,
- `lift`: confidence divided by the share of all orders that contain the consequent, rounded to 2 decimal places.

Percentages are rounded to 1 decimal place. Sort by `lift` from highest to lowest, then `antecedent`, then `consequent`.

## Starter query

```sql
WITH baskets(order_id, item) AS (
  VALUES
    ('o1', 'bread'), ('o1', 'milk'),
    ('o2', 'bread'), ('o2', 'butter'),
    ('o3', 'bread'), ('o3', 'milk'), ('o3', 'butter'), ('o3', 'bread'),
    ('o4', 'milk'),
    ('o5', 'bread'), ('o5', 'milk'),
    ('o6', 'butter'), ('o6', 'jam'),
    ('o7', 'bread'), ('o7', 'jam'),
    ('o8', 'butter'), ('o8', 'jam'),
    ('o9', 'bread'), ('o9', 'milk'), ('o9', 'jam'),
    ('o10', 'bread')
)
SELECT order_id, item
FROM baskets
ORDER BY order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Start with distinct (order, item) pairs, so a repeated item counts once per order.
2. Count orders per item in one CTE and orders per ordered pair in another (self-join the distinct pairs on `order_id` with `a.item <> b.item`), keeping pairs `HAVING COUNT(*) >= 2`.
3. With `n` the number of orders: support = pair / n; confidence = pair / orders(antecedent); lift = confidence / (orders(consequent) / n). Use `100.0` and `1.0` to avoid whole-number division.

## Solution

```sql
WITH baskets(order_id, item) AS (
  VALUES
    ('o1', 'bread'), ('o1', 'milk'),
    ('o2', 'bread'), ('o2', 'butter'),
    ('o3', 'bread'), ('o3', 'milk'), ('o3', 'butter'), ('o3', 'bread'),
    ('o4', 'milk'),
    ('o5', 'bread'), ('o5', 'milk'),
    ('o6', 'butter'), ('o6', 'jam'),
    ('o7', 'bread'), ('o7', 'jam'),
    ('o8', 'butter'), ('o8', 'jam'),
    ('o9', 'bread'), ('o9', 'milk'), ('o9', 'jam'),
    ('o10', 'bread')
),
items AS (
  SELECT DISTINCT order_id, item FROM baskets
),
total AS (
  SELECT COUNT(DISTINCT order_id) AS n FROM items
),
item_orders AS (
  SELECT item, COUNT(*) AS orders FROM items GROUP BY item
),
pairs AS (
  SELECT a.item AS antecedent, b.item AS consequent, COUNT(*) AS together
  FROM items AS a
  JOIN items AS b ON b.order_id = a.order_id AND b.item <> a.item
  GROUP BY a.item, b.item
  HAVING COUNT(*) >= 2
)
SELECT p.antecedent, p.consequent,
  ROUND(100.0 * p.together / t.n, 1) AS support_pct,
  ROUND(100.0 * p.together / ia.orders, 1) AS confidence_pct,
  ROUND((1.0 * p.together / ia.orders) / (1.0 * ic.orders / t.n), 2) AS lift
FROM pairs AS p
CROSS JOIN total AS t
JOIN item_orders AS ia ON ia.item = p.antecedent
JOIN item_orders AS ic ON ic.item = p.consequent
ORDER BY lift DESC, p.antecedent, p.consequent;
```

## Expected result

| antecedent | consequent | support_pct | confidence_pct | lift |
| --- | --- | --- | --- | --- |
| butter | jam | 20 | 50 | 1.25 |
| jam | butter | 20 | 50 | 1.25 |
| bread | milk | 40 | 57.1 | 1.14 |
| milk | bread | 40 | 80 | 1.14 |
| bread | butter | 20 | 28.6 | 0.71 |
| bread | jam | 20 | 28.6 | 0.71 |
| butter | bread | 20 | 50 | 0.71 |
| jam | bread | 20 | 50 | 0.71 |

## Explanation

Support says how common a pair is, confidence how often the antecedent comes with the consequent, and **lift** whether that is more than chance: above 1, buying one makes the other more likely; below 1, less likely.

Bread and milk are the most common pair (40% of orders), but lift is only 1.14, because both are bought so often anyway. Butter and jam are rarer together (20%), yet their lift of 1.25 is the strongest association. Bread with butter or jam has a lift of 0.71: bread buyers are **less** likely than average to take them, so promoting those pairs would not help.

**Common mistake:** counting rows instead of orders. Order o3 lists bread twice, which would count bread-and-milk twice for that order.

## Wrong answers

Feedback: incorrect-output

```sql
WITH baskets(order_id, item) AS ( VALUES ('o1', 'bread'), ('o1', 'milk'), ('o2', 'bread'), ('o2', 'butter'), ('o3', 'bread'), ('o3', 'milk'), ('o3', 'butter'), ('o3', 'bread'), ('o4', 'milk'), ('o5', 'bread'), ('o5', 'milk'), ('o6', 'butter'), ('o6', 'jam'), ('o7', 'bread'), ('o7', 'jam'), ('o8', 'butter'), ('o8', 'jam'), ('o9', 'bread'), ('o9', 'milk'), ('o9', 'jam'), ('o10', 'bread') ), total AS (SELECT COUNT(DISTINCT order_id) AS n FROM baskets), item_orders AS (SELECT item, COUNT(*) AS orders FROM baskets GROUP BY item), pairs AS (SELECT a.item AS antecedent, b.item AS consequent, COUNT(*) AS together FROM baskets AS a JOIN baskets AS b ON b.order_id = a.order_id AND b.item <> a.item GROUP BY a.item, b.item HAVING COUNT(*) >= 2) SELECT p.antecedent, p.consequent, ROUND(100.0 * p.together / t.n, 1) AS support_pct, ROUND(100.0 * p.together / ia.orders, 1) AS confidence_pct, ROUND((1.0 * p.together / ia.orders) / (1.0 * ic.orders / t.n), 2) AS lift FROM pairs AS p CROSS JOIN total AS t JOIN item_orders AS ia ON ia.item = p.antecedent JOIN item_orders AS ic ON ic.item = p.consequent ORDER BY lift DESC, p.antecedent, p.consequent;
```
