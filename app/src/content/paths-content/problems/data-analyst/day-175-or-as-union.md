---
id: da-day-175
title: Rewrite OR across columns as UNION
order: 175
difficulty: intermediate
topic: Query performance
summary: Split an OR over different columns into index-friendly parts without duplicating rows.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Rewrite OR conditions as UNION
  - Choose UNION over UNION ALL when parts overlap
prerequisites:
  - Day 34
  - Day 172
---

## Task

Risk reviews orders (in the starter query) that are **over 500**, **or** shipped to a different country from the billing country, **or** have no billing country at all. On the real table `amount` and `ship_country` have separate indexes, and an `OR` across different columns often stops either from being used.

Write the query as a `UNION` of one `SELECT` per condition. Return `id`, `amount`, `ship_country` and `bill_country`, each order once. Sort by `id`.

## Starter query

```sql
WITH web_orders(id, amount, ship_country, bill_country) AS (
  VALUES
    (1, 120, 'IN', 'IN'), (2, 650, 'IN', 'IN'), (3, 80, 'US', 'IN'), (4, 900, 'AE', 'IN'),
    (5, 300, 'IN', NULL), (6, 500, 'IN', 'IN'), (7, 45, 'SG', 'SG')
)
SELECT id, amount, ship_country, bill_country
FROM web_orders
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Three parts: `WHERE amount > 500`, `WHERE ship_country <> bill_country` and `WHERE bill_country IS NULL`. `<>` is never true when `bill_country` is `NULL`, which is why the third part is needed.
3. Use `UNION`, not `UNION ALL`: order 4 matches two conditions and must appear once. `ORDER BY id` goes after the last part.

## Solution

```sql
WITH web_orders(id, amount, ship_country, bill_country) AS (
  VALUES
    (1, 120, 'IN', 'IN'), (2, 650, 'IN', 'IN'), (3, 80, 'US', 'IN'), (4, 900, 'AE', 'IN'),
    (5, 300, 'IN', NULL), (6, 500, 'IN', 'IN'), (7, 45, 'SG', 'SG')
)
SELECT id, amount, ship_country, bill_country FROM web_orders WHERE amount > 500
UNION
SELECT id, amount, ship_country, bill_country FROM web_orders WHERE ship_country <> bill_country
UNION
SELECT id, amount, ship_country, bill_country FROM web_orders WHERE bill_country IS NULL
ORDER BY id;
```

## Expected result

| id | amount | ship_country | bill_country |
| --- | --- | --- | --- |
| 2 | 650 | IN | IN |
| 3 | 80 | US | IN |
| 4 | 900 | AE | IN |
| 5 | 300 | IN | NULL |

## Explanation

Many databases can use one index per table access. With `WHERE amount > 500 OR ship_country <> bill_country`, neither index alone finds all matches, so the planner may scan the whole table. Splitting the conditions lets each part use its own index; `UNION` then merges the parts and removes duplicates. (SQLite can sometimes do this itself, which is called an OR optimisation, but writing it out makes the plan predictable.)

Two details decide correctness. Order 4 is both large and cross-border: `UNION ALL` would list it twice, so `UNION`'s duplicate removal is required here. Order 5 has no billing country, and `'IN' <> NULL` is unknown rather than true, so it needs its own condition. Order 6 is exactly 500, which is not *over* 500.

**Common mistake:** `UNION ALL`, which double-counts orders that match more than one rule.

## Other accepted answers

```sql
WITH web_orders(id, amount, ship_country, bill_country) AS (
  VALUES
    (1, 120, 'IN', 'IN'), (2, 650, 'IN', 'IN'), (3, 80, 'US', 'IN'), (4, 900, 'AE', 'IN'),
    (5, 300, 'IN', NULL), (6, 500, 'IN', 'IN'), (7, 45, 'SG', 'SG')
)
SELECT id, amount, ship_country, bill_country FROM web_orders
WHERE amount > 500 OR ship_country <> bill_country OR bill_country IS NULL
ORDER BY id;
```

## Wrong answers

Feedback: extra-rows

```sql
WITH web_orders(id, amount, ship_country, bill_country) AS ( VALUES (1, 120, 'IN', 'IN'), (2, 650, 'IN', 'IN'), (3, 80, 'US', 'IN'), (4, 900, 'AE', 'IN'), (5, 300, 'IN', NULL), (6, 500, 'IN', 'IN'), (7, 45, 'SG', 'SG') ) SELECT id, amount, ship_country, bill_country FROM web_orders WHERE amount > 500 UNION ALL SELECT id, amount, ship_country, bill_country FROM web_orders WHERE ship_country <> bill_country UNION ALL SELECT id, amount, ship_country, bill_country FROM web_orders WHERE bill_country IS NULL ORDER BY id;
```

Feedback: missing-rows

```sql
WITH web_orders(id, amount, ship_country, bill_country) AS ( VALUES (1, 120, 'IN', 'IN'), (2, 650, 'IN', 'IN'), (3, 80, 'US', 'IN'), (4, 900, 'AE', 'IN'), (5, 300, 'IN', NULL), (6, 500, 'IN', 'IN'), (7, 45, 'SG', 'SG') ) SELECT id, amount, ship_country, bill_country FROM web_orders WHERE amount > 500 UNION SELECT id, amount, ship_country, bill_country FROM web_orders WHERE ship_country <> bill_country ORDER BY id;
```
