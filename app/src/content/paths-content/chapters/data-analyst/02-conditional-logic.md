---
id: conditional-logic
title: Conditional logic with CASE
module: data-analyst
order: 2
level: intermediate
duration: 30
summary: Turn raw values into business categories, build yes/no flags, and count several categories side by side with CASE.
objectives:
  - Label rows with CASE WHEN ... THEN ... ELSE ... END
  - Group and count rows by a category you defined
  - Build several counts or totals in one row with conditional aggregation
  - Avoid the ordering and NULL traps of CASE
---

Raw data rarely comes in the categories a business talks about. The `books` table has exact prices, but the sales team talks about "budget", "standard" and "premium" books. `CASE` lets you define those categories inside a query, so the database does the labelling and you never edit data by hand.

## Why analysts use this

Analysts use `CASE` every day to:

- **Bucket** numbers into bands: price ranges, order sizes, age groups.
- **Flag** rows: is this order cancelled? Is this customer new?
- **Pivot** categories into columns: delivered, shipped and cancelled orders side by side in one row, which is how most reports are laid out.
- **Clean** values: turn codes into readable labels.

Because the rule lives in the query, everyone who runs it gets the same categories, and changing a threshold means changing one line.

## Syntax

```sql syntax
CASE
  WHEN condition_1 THEN result_1
  WHEN condition_2 THEN result_2
  ELSE other_result
END
```

- SQL checks the `WHEN` conditions **from top to bottom** and uses the result of the **first** one that is true.
- `ELSE` is used when no condition is true. Without `ELSE`, the result is `NULL`.
- A `CASE ... END` expression can go anywhere a value can: in `SELECT`, `WHERE`, `GROUP BY`, `ORDER BY`, and inside functions such as `SUM`.
- Give the result a name with `AS`, for example `END AS price_band`.

## Examples

### Label each book with a price band

```sql
SELECT title, price,
  CASE
    WHEN price < 12 THEN 'Budget'
    WHEN price < 15 THEN 'Standard'
    ELSE 'Premium'
  END AS price_band
FROM books
ORDER BY price;
```

Expected output:

| title | price | price_band |
| --- | --- | --- |
| Counting Stars | 9.99 | Budget |
| Paper Lanterns | 11.25 | Budget |
| The Silent Orchard | 12.99 | Standard |
| A Quiet Ledger | 14.75 | Standard |
| Rivers of Glass | 15.5 | Premium |
| The Last Signal | 18 | Premium |

*A Quiet Ledger* costs 14.75: it is not below 12, so the first condition is false; it is below 15, so it is "Standard".

### Count books in each band

Group by the same `CASE` expression to count each category. SQLite lets you group by the alias you gave it:

```sql
SELECT
  CASE
    WHEN price < 12 THEN 'Budget'
    WHEN price < 15 THEN 'Standard'
    ELSE 'Premium'
  END AS price_band,
  COUNT(*) AS books
FROM books
GROUP BY price_band
ORDER BY books DESC, price_band;
```

| price_band | books |
| --- | --- |
| Budget | 2 |
| Premium | 2 |
| Standard | 2 |

### Flag rows with 1 and 0

A flag is a column that is 1 when something is true and 0 when it is not. Flags are easy to add up later:

```sql
SELECT id, status,
  CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END AS is_cancelled
FROM orders
ORDER BY id;
```

| id | status | is_cancelled |
| --- | --- | --- |
| 1 | delivered | 0 |
| 2 | delivered | 0 |
| 3 | shipped | 0 |
| 4 | cancelled | 1 |
| 5 | delivered | 0 |
| 6 | shipped | 0 |

### Several counts in one row: conditional aggregation

Putting `CASE` inside `SUM` counts only the rows that meet a condition. This turns order statuses into columns, one row per customer:

```sql
SELECT c.name,
  SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
  SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY c.name;
```

| name | delivered | shipped | cancelled |
| --- | --- | --- | --- |
| Aisha Khan | 1 | 1 | 0 |
| Daniel Kim | 1 | 0 | 0 |
| Rahul Mehta | 1 | 1 | 0 |
| Sofia Rossi | 0 | 0 | 1 |

This "pivot" layout is what most dashboards and spreadsheets expect: one row per thing, one column per category.

### Totals by category in one row

The same idea works for amounts. Revenue from delivered orders next to revenue still on its way:

```sql
SELECT
  ROUND(SUM(CASE WHEN o.status = 'delivered' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS delivered_revenue,
  ROUND(SUM(CASE WHEN o.status = 'shipped' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS shipped_revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

| delivered_revenue | shipped_revenue |
| --- | --- |
| 94.22 | 39.24 |

## How the query runs

For the price-band count:

1. `FROM books` reads the 6 books.
2. For each book, `CASE` checks `price < 12`, then `price < 15`, and falls back to `'Premium'`. Each book gets exactly one label.
3. `GROUP BY price_band` makes one group per label.
4. `COUNT(*)` counts the books in each group, and `ORDER BY` sorts the groups.

## Common mistakes

**Putting the conditions in the wrong order.** Only the first true condition counts. Here every book under 15 is caught by the first line, so no book is ever "Budget":

```sql
SELECT title, price,
  CASE
    WHEN price < 15 THEN 'Standard'
    WHEN price < 12 THEN 'Budget'
    ELSE 'Premium'
  END AS price_band
FROM books
ORDER BY price;
```

| title | price | price_band |
| --- | --- | --- |
| Counting Stars | 9.99 | Standard |
| Paper Lanterns | 11.25 | Standard |
| The Silent Orchard | 12.99 | Standard |
| A Quiet Ledger | 14.75 | Standard |
| Rivers of Glass | 15.5 | Premium |
| The Last Signal | 18 | Premium |

Write ranges from the most specific to the most general, or give each range both ends (`price >= 12 AND price < 15`).

**Forgetting ELSE.** Without `ELSE`, rows that match no condition get `NULL`, which then disappears from counts and filters:

```sql
SELECT title, CASE WHEN genre = 'Mystery' THEN 'Crime' END AS shelf
FROM books
ORDER BY id;
```

| title | shelf |
| --- | --- |
| The Silent Orchard | Crime |
| Rivers of Glass | NULL |
| Counting Stars | NULL |
| The Last Signal | NULL |
| Paper Lanterns | NULL |
| A Quiet Ledger | Crime |

**Forgetting END.** Every `CASE` needs its `END`:

```sql error
SELECT title, CASE WHEN price < 12 THEN 'Budget' ELSE 'Other' AS band FROM books;
```

## Key takeaways

- `CASE WHEN ... THEN ... ELSE ... END` returns a value chosen by conditions, checked from top to bottom.
- Use it to bucket numbers, flag rows and translate codes into labels.
- `GROUP BY` a `CASE` expression to count each category.
- `SUM(CASE WHEN condition THEN 1 ELSE 0 END)` counts matching rows; put an amount instead of 1 to total it. This is how you pivot categories into columns.
- Always think about `ELSE`: a missing `ELSE` produces `NULL`.
