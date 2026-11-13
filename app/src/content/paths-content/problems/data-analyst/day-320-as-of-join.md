---
id: da-day-320
title: Match each trade to the latest quote before it
order: 320
difficulty: advanced
topic: SQL patterns
summary: Join every trade to the most recent quote at or before its time, and measure slippage.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Write an as-of join
  - Measure slippage against a reference price
prerequisites:
  - Day 160
  - Day 127
---

## Task

An **as-of join** matches each row to the latest row of another table at or before its time. For each trade (starter query), find the latest quote for the same symbol at or before `traded_at`, and compute `slippage` = `(trade_price − quote_price) × qty`. A trade before any quote has `NULL` quote and slippage.

Return `trade_id`, `symbol`, `traded_at`, `quote_time`, `quote_price`, `trade_price` and `slippage` (rounded to 2 decimal places). Sort by `trade_id`.

## Starter query

```sql
WITH quotes(symbol, quoted_at, price) AS (
  VALUES
    ('INFY', '09:15', 1500.0), ('INFY', '09:30', 1504.5), ('INFY', '10:00', 1498.0), ('TCS', '09:15', 3900.0), ('TCS', '09:45', 3912.0)
),
trades(trade_id, symbol, traded_at, qty, trade_price) AS (
  VALUES
    (1, 'INFY', '09:20', 10, 1501.0), (2, 'INFY', '09:30', 5, 1505.0), (3, 'INFY', '10:05', 8, 1497.0),
    (4, 'TCS', '09:10', 3, 3899.0), (5, 'TCS', '09:50', 4, 3915.0)
)
SELECT 'quote' AS kind, symbol, quoted_at AS at, price FROM quotes
UNION ALL
SELECT 'trade', symbol, traded_at, trade_price FROM trades
ORDER BY symbol, at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Find each trade's quote time with a correlated subquery: `(SELECT MAX(q.quoted_at) FROM quotes AS q WHERE q.symbol = t.symbol AND q.quoted_at <= t.traded_at)`.
3. Then `LEFT JOIN quotes` on the symbol and that time to fetch the price, so a trade with no earlier quote keeps `NULL`s.

## Solution

```sql
WITH quotes(symbol, quoted_at, price) AS (
  VALUES
    ('INFY', '09:15', 1500.0), ('INFY', '09:30', 1504.5), ('INFY', '10:00', 1498.0), ('TCS', '09:15', 3900.0), ('TCS', '09:45', 3912.0)
),
trades(trade_id, symbol, traded_at, qty, trade_price) AS (
  VALUES
    (1, 'INFY', '09:20', 10, 1501.0), (2, 'INFY', '09:30', 5, 1505.0), (3, 'INFY', '10:05', 8, 1497.0),
    (4, 'TCS', '09:10', 3, 3899.0), (5, 'TCS', '09:50', 4, 3915.0)
),
matched AS (
  SELECT t.trade_id, t.symbol, t.traded_at, t.qty, t.trade_price,
    (SELECT MAX(q.quoted_at) FROM quotes AS q WHERE q.symbol = t.symbol AND q.quoted_at <= t.traded_at) AS quote_time
  FROM trades AS t
)
SELECT m.trade_id, m.symbol, m.traded_at, m.quote_time, q.price AS quote_price, m.trade_price,
  ROUND((m.trade_price - q.price) * m.qty, 2) AS slippage
FROM matched AS m
LEFT JOIN quotes AS q ON q.symbol = m.symbol AND q.quoted_at = m.quote_time
ORDER BY m.trade_id;
```

## Expected result

| trade_id | symbol | traded_at | quote_time | quote_price | trade_price | slippage |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | INFY | 09:20 | 09:15 | 1500 | 1501 | 10 |
| 2 | INFY | 09:30 | 09:30 | 1504.5 | 1505 | 2.5 |
| 3 | INFY | 10:05 | 10:00 | 1498 | 1497 | -8 |
| 4 | TCS | 09:10 | NULL | NULL | 3899 | NULL |
| 5 | TCS | 09:50 | 09:45 | 3912 | 3915 | 12 |

## Explanation

An as-of join matches each row to the latest earlier row of another table, here the quote in force when the trade happened. A correlated subquery finds each trade's quote time (the latest quote at or before it), and a `LEFT JOIN` on that time fetches the price.

Trade 2 happened at the same minute as a quote, which counts as "at or before". Trade 4 happened before TCS's first quote, so it has no reference price and its slippage is `NULL` rather than being compared with a later price it could not have seen. Slippage multiplies the price difference by quantity: buying INFY 1 rupee above the quote on 10 shares cost 10.

**Common mistake:** matching the next quote instead of the previous one. Each trade is compared with a price that did not exist yet when it was made, which makes execution quality look better or worse with hindsight.

## Wrong answers

Feedback: incorrect-output

```sql
WITH quotes(symbol, quoted_at, price) AS ( VALUES ('INFY', '09:15', 1500.0), ('INFY', '09:30', 1504.5), ('INFY', '10:00', 1498.0), ('TCS', '09:15', 3900.0), ('TCS', '09:45', 3912.0) ), trades(trade_id, symbol, traded_at, qty, trade_price) AS ( VALUES (1, 'INFY', '09:20', 10, 1501.0), (2, 'INFY', '09:30', 5, 1505.0), (3, 'INFY', '10:05', 8, 1497.0), (4, 'TCS', '09:10', 3, 3899.0), (5, 'TCS', '09:50', 4, 3915.0) ), matched AS (SELECT t.trade_id, t.symbol, t.traded_at, t.qty, t.trade_price, (SELECT MIN(q.quoted_at) FROM quotes AS q WHERE q.symbol = t.symbol AND q.quoted_at >= t.traded_at) AS quote_time FROM trades AS t) SELECT m.trade_id, m.symbol, m.traded_at, m.quote_time, q.price AS quote_price, m.trade_price, ROUND((m.trade_price - q.price) * m.qty, 2) AS slippage FROM matched AS m LEFT JOIN quotes AS q ON q.symbol = m.symbol AND q.quoted_at = m.quote_time ORDER BY m.trade_id;
```
