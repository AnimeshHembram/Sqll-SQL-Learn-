---
id: da-day-311
title: Cards used too often in a short time
order: 311
difficulty: advanced
topic: Risk analytics
summary: Flag transactions that are the fourth or later on the same card within ten minutes.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count events in a sliding time window
  - Write a velocity rule with a self-join
prerequisites:
  - Day 110
  - Day 202
---

## Task

A common fraud rule flags a card when it is used **4 or more times within 10 minutes**. For each transaction (starter query), count the transactions on the same card in the 10 minutes up to and including it (from 10 minutes before to its own time). Return the transactions where that count is 4 or more: `txn_id`, `card`, `txn_at`, `txns_in_10_min` and `amount_in_10_min` (their total amount). Sort by `txn_id`.

## Starter query

```sql
WITH transactions(txn_id, card, txn_at, amount) AS (
  VALUES
    (1, 'card-A', '2025-03-10 10:00', 1200), (2, 'card-A', '2025-03-10 10:03', 450), (3, 'card-A', '2025-03-10 10:06', 990),
    (4, 'card-A', '2025-03-10 10:08', 2400), (5, 'card-A', '2025-03-10 14:00', 300), (6, 'card-B', '2025-03-10 09:00', 500),
    (7, 'card-B', '2025-03-10 09:20', 700), (8, 'card-B', '2025-03-10 09:40', 650), (9, 'card-C', '2025-03-10 11:00', 150),
    (10, 'card-C', '2025-03-10 11:04', 160), (11, 'card-C', '2025-03-10 11:09', 170), (12, 'card-C', '2025-03-10 11:10', 180)
)
SELECT txn_id, card, txn_at, amount
FROM transactions
ORDER BY card, txn_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Self-join each transaction to the same card's transactions with `p.txn_at BETWEEN datetime(t.txn_at, '-10 minutes') AND t.txn_at`.
3. Group by the current transaction: `COUNT(*)` and `SUM(p.amount)`, then keep groups with `HAVING COUNT(*) >= 4`. Timestamps without seconds compare correctly once `datetime()` adds them, so normalise both sides with `datetime()`.

## Solution

```sql
WITH transactions(txn_id, card, txn_at, amount) AS (
  VALUES
    (1, 'card-A', '2025-03-10 10:00', 1200), (2, 'card-A', '2025-03-10 10:03', 450), (3, 'card-A', '2025-03-10 10:06', 990),
    (4, 'card-A', '2025-03-10 10:08', 2400), (5, 'card-A', '2025-03-10 14:00', 300), (6, 'card-B', '2025-03-10 09:00', 500),
    (7, 'card-B', '2025-03-10 09:20', 700), (8, 'card-B', '2025-03-10 09:40', 650), (9, 'card-C', '2025-03-10 11:00', 150),
    (10, 'card-C', '2025-03-10 11:04', 160), (11, 'card-C', '2025-03-10 11:09', 170), (12, 'card-C', '2025-03-10 11:10', 180)
)
SELECT t.txn_id, t.card, t.txn_at, COUNT(*) AS txns_in_10_min, SUM(p.amount) AS amount_in_10_min
FROM transactions AS t
JOIN transactions AS p
  ON p.card = t.card AND datetime(p.txn_at) BETWEEN datetime(t.txn_at, '-10 minutes') AND datetime(t.txn_at)
GROUP BY t.txn_id, t.card, t.txn_at
HAVING COUNT(*) >= 4
ORDER BY t.txn_id;
```

## Expected result

| txn_id | card | txn_at | txns_in_10_min | amount_in_10_min |
| --- | --- | --- | --- | --- |
| 4 | card-A | 2025-03-10 10:08 | 4 | 5040 |
| 12 | card-C | 2025-03-10 11:10 | 4 | 660 |

## Explanation

A velocity rule counts how many times a card was used in a short window before each transaction. A self-join on the same card with the other transaction's time between 10 minutes earlier and now gives that count. Card A made four purchases within eight minutes (5,040 in total), and card C four small ones within ten minutes, a pattern typical of card testing.

Card B was used three times, 20 minutes apart, which is normal. The timestamps here have no seconds, while `datetime(...)` adds them; comparing the raw text with a value that has seconds goes wrong at the edges (`'11:00'` sorts before `'11:00:00'`), so both sides are normalised with `datetime()`.

**Common mistake:** comparing the raw timestamp with `datetime(..., '-10 minutes')`. A transaction exactly 10 minutes earlier, like card C's first one, falls outside the window, and card C is never flagged.

## Wrong answers

Feedback: missing-rows

```sql
WITH transactions(txn_id, card, txn_at, amount) AS ( VALUES (1, 'card-A', '2025-03-10 10:00', 1200), (2, 'card-A', '2025-03-10 10:03', 450), (3, 'card-A', '2025-03-10 10:06', 990), (4, 'card-A', '2025-03-10 10:08', 2400), (5, 'card-A', '2025-03-10 14:00', 300), (6, 'card-B', '2025-03-10 09:00', 500), (7, 'card-B', '2025-03-10 09:20', 700), (8, 'card-B', '2025-03-10 09:40', 650), (9, 'card-C', '2025-03-10 11:00', 150), (10, 'card-C', '2025-03-10 11:04', 160), (11, 'card-C', '2025-03-10 11:09', 170), (12, 'card-C', '2025-03-10 11:10', 180) ) SELECT t.txn_id, t.card, t.txn_at, COUNT(*) AS txns_in_10_min, SUM(p.amount) AS amount_in_10_min FROM transactions AS t JOIN transactions AS p ON p.card = t.card AND p.txn_at BETWEEN datetime(t.txn_at, '-10 minutes') AND t.txn_at GROUP BY t.txn_id, t.card, t.txn_at HAVING COUNT(*) >= 4 ORDER BY t.txn_id;
```

Feedback: extra-rows

```sql
WITH transactions(txn_id, card, txn_at, amount) AS ( VALUES (1, 'card-A', '2025-03-10 10:00', 1200), (2, 'card-A', '2025-03-10 10:03', 450), (3, 'card-A', '2025-03-10 10:06', 990), (4, 'card-A', '2025-03-10 10:08', 2400), (5, 'card-A', '2025-03-10 14:00', 300), (6, 'card-B', '2025-03-10 09:00', 500), (7, 'card-B', '2025-03-10 09:20', 700), (8, 'card-B', '2025-03-10 09:40', 650), (9, 'card-C', '2025-03-10 11:00', 150), (10, 'card-C', '2025-03-10 11:04', 160), (11, 'card-C', '2025-03-10 11:09', 170), (12, 'card-C', '2025-03-10 11:10', 180) ) SELECT t.txn_id, t.card, t.txn_at, COUNT(*) AS txns_in_10_min, SUM(p.amount) AS amount_in_10_min FROM transactions AS t JOIN transactions AS p ON p.card = t.card AND datetime(p.txn_at) BETWEEN datetime(t.txn_at, '-10 minutes') AND datetime(t.txn_at, '+10 minutes') GROUP BY t.txn_id, t.card, t.txn_at HAVING COUNT(*) >= 4 ORDER BY t.txn_id;
```
