---
id: da-day-170
title: Find where a stored balance drifted
order: 170
difficulty: intermediate
topic: Data engineering
summary: Recompute a running balance and find the first row where the stored value disagrees, allowing for rounding.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Recompute a running balance with a window
  - Compare decimals with a tolerance
prerequisites:
  - Day 100
  - Day 40
---

## Task

Each ledger row (in the starter query) stores the account's balance after the movement. A bug may have corrupted some balances. Recompute the running balance per account in `seq` order and find, for each account, the **first** `seq` where the stored balance differs from the recomputed one by more than 0.005 (smaller differences are floating-point rounding).

Return `account`, `seq`, `stored_balance`, `computed_balance` and `difference` (stored minus computed), both rounded to 2 decimal places. Accounts without drift are left out. Sort by `account`.

## Starter query

```sql
WITH ledger(account, seq, amount, stored_balance) AS (
  VALUES
    ('A', 1, 100, 100), ('A', 2, -30, 70), ('A', 3, 50, 120), ('A', 4, -20, 100),
    ('B', 1, 200, 200), ('B', 2, -50, 150), ('B', 3, 25, 180), ('B', 4, 10, 190),
    ('C', 1, 10.1, 10.1), ('C', 2, 20.2, 30.3), ('C', 3, 0.1, 30.4), ('C', 4, 5, 35.41),
    ('D', 2, 50, 50), ('D', 1, 100, 100)
)
SELECT account, seq, amount, stored_balance
FROM ledger
ORDER BY account, seq;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Recompute: `SUM(amount) OVER (PARTITION BY account ORDER BY seq)`. The rows are not stored in order, but the window's `ORDER BY` takes care of that.
3. Keep rows with `ABS(stored_balance - computed) > 0.005`, then the first per account with `ROW_NUMBER() OVER (PARTITION BY account ORDER BY seq)`.

## Solution

```sql
WITH ledger(account, seq, amount, stored_balance) AS (
  VALUES
    ('A', 1, 100, 100), ('A', 2, -30, 70), ('A', 3, 50, 120), ('A', 4, -20, 100),
    ('B', 1, 200, 200), ('B', 2, -50, 150), ('B', 3, 25, 180), ('B', 4, 10, 190),
    ('C', 1, 10.1, 10.1), ('C', 2, 20.2, 30.3), ('C', 3, 0.1, 30.4), ('C', 4, 5, 35.41),
    ('D', 2, 50, 50), ('D', 1, 100, 100)
),
recomputed AS (
  SELECT account, seq, stored_balance,
    SUM(amount) OVER (PARTITION BY account ORDER BY seq) AS computed
  FROM ledger
),
drifted AS (
  SELECT account, seq, stored_balance, computed,
    ROW_NUMBER() OVER (PARTITION BY account ORDER BY seq) AS n
  FROM recomputed
  WHERE ABS(stored_balance - computed) > 0.005
)
SELECT account, seq, ROUND(stored_balance, 2) AS stored_balance, ROUND(computed, 2) AS computed_balance,
  ROUND(stored_balance - computed, 2) AS difference
FROM drifted
WHERE n = 1
ORDER BY account;
```

## Expected result

| account | seq | stored_balance | computed_balance | difference |
| --- | --- | --- | --- | --- |
| B | 3 | 180 | 175 | 5 |
| C | 4 | 35.41 | 35.4 | 0.01 |
| D | 2 | 50 | 150 | -100 |

## Explanation

Recomputing a derived column from its source is a basic reconciliation: it proves the data is internally consistent and shows exactly where it stops being so. Account B drifts at seq 3 by 5 and stays wrong afterwards, because every later balance builds on the bad one; the first row is where to start debugging.

Account C shows why the tolerance matters. In floating point, 10.1 + 20.2 is 30.299999999999997, not 30.3, so an exact comparison would report a false alarm at seq 2; the real problem is the 0.01 at seq 4. Account D's rows are stored in reverse order, which the window's `ORDER BY seq` handles.

**Common mistake:** comparing with `<>`, which flags floating-point noise. For money, many systems store whole paise or cents as integers for exactly this reason.

## Wrong answers

Feedback: incorrect-output

```sql
WITH ledger(account, seq, amount, stored_balance) AS ( VALUES ('A', 1, 100, 100), ('A', 2, -30, 70), ('A', 3, 50, 120), ('A', 4, -20, 100), ('B', 1, 200, 200), ('B', 2, -50, 150), ('B', 3, 25, 180), ('B', 4, 10, 190), ('C', 1, 10.1, 10.1), ('C', 2, 20.2, 30.3), ('C', 3, 0.1, 30.4), ('C', 4, 5, 35.41), ('D', 2, 50, 50), ('D', 1, 100, 100) ), recomputed AS (SELECT account, seq, stored_balance, SUM(amount) OVER (PARTITION BY account ORDER BY seq) AS computed FROM ledger), drifted AS (SELECT account, seq, stored_balance, computed, ROW_NUMBER() OVER (PARTITION BY account ORDER BY seq) AS n FROM recomputed WHERE stored_balance <> computed) SELECT account, seq, ROUND(stored_balance, 2) AS stored_balance, ROUND(computed, 2) AS computed_balance, ROUND(stored_balance - computed, 2) AS difference FROM drifted WHERE n = 1 ORDER BY account;
```
