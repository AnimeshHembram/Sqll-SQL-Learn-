---
id: da-day-316
title: A running balance that restarts at zero
order: 316
difficulty: advanced
topic: SQL patterns
summary: Number the periods between zero balances and run a separate total within each, without recursion.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Start new groups from a condition on the previous row
  - Run totals within derived groups
prerequisites:
  - Day 224
  - Day 103
---

## Task

A customer's account (starter query) goes up with charges and down with payments. Each time the balance returns to **exactly 0**, the account is settled and a new **cycle** starts with the next movement. For each movement, return `customer`, `seq`, `amount`, `balance` (the running balance), `cycle` (1 for the first cycle, then 2, …), `movement_in_cycle` (1, 2, … within each cycle) and `cycle_charges` (the running total of **positive** amounts within the cycle, so it restarts at each new cycle). Sort by `customer`, then `seq`.

## Starter query

```sql
WITH movements(seq, customer, amount) AS (
  VALUES
    (1, 'c1', 500), (2, 'c1', -300), (3, 'c1', -200), (4, 'c1', 400), (5, 'c1', -100),
    (6, 'c2', 200), (7, 'c2', -200), (8, 'c2', 150)
)
SELECT seq, customer, amount
FROM movements
ORDER BY customer, seq;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Running balance: `SUM(amount) OVER (PARTITION BY customer ORDER BY seq)`. A movement starts a new cycle when the balance **before** it was 0, which is the previous row's balance.
3. Mark settled rows (`balance = 0`) and count them with a running sum over the **earlier** rows (`ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`); add 1 to get the cycle number. Then partition by customer and cycle for the rest.

## Solution

```sql
WITH movements(seq, customer, amount) AS (
  VALUES
    (1, 'c1', 500), (2, 'c1', -300), (3, 'c1', -200), (4, 'c1', 400), (5, 'c1', -100),
    (6, 'c2', 200), (7, 'c2', -200), (8, 'c2', 150)
),
balances AS (
  SELECT customer, seq, amount, SUM(amount) OVER (PARTITION BY customer ORDER BY seq) AS balance FROM movements
),
cycles AS (
  SELECT customer, seq, amount, balance,
    1 + COALESCE(SUM(balance = 0) OVER (PARTITION BY customer ORDER BY seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cycle
  FROM balances
)
SELECT customer, seq, amount, balance, cycle,
  ROW_NUMBER() OVER (PARTITION BY customer, cycle ORDER BY seq) AS movement_in_cycle,
  SUM(MAX(amount, 0)) OVER (PARTITION BY customer, cycle ORDER BY seq) AS cycle_charges
FROM cycles
ORDER BY customer, seq;
```

## Expected result

| customer | seq | amount | balance | cycle | movement_in_cycle | cycle_charges |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | 1 | 500 | 500 | 1 | 1 | 500 |
| c1 | 2 | -300 | 200 | 1 | 2 | 500 |
| c1 | 3 | -200 | 0 | 1 | 3 | 500 |
| c1 | 4 | 400 | 400 | 2 | 1 | 400 |
| c1 | 5 | -100 | 300 | 2 | 2 | 400 |
| c2 | 6 | 200 | 200 | 1 | 1 | 200 |
| c2 | 7 | -200 | 0 | 1 | 2 | 200 |
| c2 | 8 | 150 | 150 | 2 | 1 | 150 |

## Explanation

A running total that "resets" is really a running total within groups that have to be derived first. A new cycle starts with the movement after the balance hits 0, so the cycle number is 1 plus the number of zero balances **before** the current row: a running sum of `balance = 0` with a frame that ends at `1 PRECEDING`.

c1's balance returns to 0 at movement 3, so movement 4 starts cycle 2; c2 settles at movement 7. Within each cycle the movement counter and the charges restart, which is what a statement per billing cycle needs.

**Common mistake:** counting zero balances up to and including the current row. The movement that settles the balance is then put into the next cycle, so every settlement appears as the first line of a new cycle.

## Wrong answers

Feedback: incorrect-output

```sql
WITH movements(seq, customer, amount) AS ( VALUES (1, 'c1', 500), (2, 'c1', -300), (3, 'c1', -200), (4, 'c1', 400), (5, 'c1', -100), (6, 'c2', 200), (7, 'c2', -200), (8, 'c2', 150) ), balances AS (SELECT customer, seq, amount, SUM(amount) OVER (PARTITION BY customer ORDER BY seq) AS balance FROM movements), cycles AS (SELECT customer, seq, amount, balance, 1 + SUM(balance = 0) OVER (PARTITION BY customer ORDER BY seq) AS cycle FROM balances) SELECT customer, seq, amount, balance, cycle, ROW_NUMBER() OVER (PARTITION BY customer, cycle ORDER BY seq) AS movement_in_cycle, SUM(MAX(amount, 0)) OVER (PARTITION BY customer, cycle ORDER BY seq) AS cycle_charges FROM cycles ORDER BY customer, seq;
```
