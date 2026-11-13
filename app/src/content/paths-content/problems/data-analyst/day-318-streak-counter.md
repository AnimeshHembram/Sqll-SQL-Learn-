---
id: da-day-318
title: The current streak on every row
order: 318
difficulty: advanced
topic: SQL patterns
summary: Count how long the current run of the same outcome has lasted at each row, restarting when it changes.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Number rows within islands
  - Build a running streak label
prerequisites:
  - Day 265
  - Day 261
---

## Task

For each team's results in date order (starter query), show the **current streak** after each game: `'W3'` means three wins in a row ending with this game, `'L1'` one loss. Return `team`, `played_on`, `outcome` and `streak`, sorted by `team`, then `played_on`.

## Starter query

```sql
WITH results(team, played_on, outcome) AS (
  VALUES
    ('Tigers', '2025-03-01', 'W'), ('Tigers', '2025-03-03', 'W'), ('Tigers', '2025-03-05', 'L'), ('Tigers', '2025-03-07', 'W'),
    ('Tigers', '2025-03-09', 'W'), ('Tigers', '2025-03-11', 'W'), ('Lions', '2025-03-02', 'L'), ('Lions', '2025-03-04', 'L'),
    ('Lions', '2025-03-06', 'W'), ('Lions', '2025-03-08', 'L')
)
SELECT team, played_on, outcome
FROM results
ORDER BY team, played_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Islands again: `ROW_NUMBER() OVER (PARTITION BY team ORDER BY played_on) - ROW_NUMBER() OVER (PARTITION BY team, outcome ORDER BY played_on)` is constant within a run of one outcome.
3. Within each run, `ROW_NUMBER() OVER (PARTITION BY team, outcome, island ORDER BY played_on)` is the streak length so far; prefix it with the outcome.

## Solution

```sql
WITH results(team, played_on, outcome) AS (
  VALUES
    ('Tigers', '2025-03-01', 'W'), ('Tigers', '2025-03-03', 'W'), ('Tigers', '2025-03-05', 'L'), ('Tigers', '2025-03-07', 'W'),
    ('Tigers', '2025-03-09', 'W'), ('Tigers', '2025-03-11', 'W'), ('Lions', '2025-03-02', 'L'), ('Lions', '2025-03-04', 'L'),
    ('Lions', '2025-03-06', 'W'), ('Lions', '2025-03-08', 'L')
),
islands AS (
  SELECT team, played_on, outcome,
    ROW_NUMBER() OVER (PARTITION BY team ORDER BY played_on) - ROW_NUMBER() OVER (PARTITION BY team, outcome ORDER BY played_on) AS island
  FROM results
)
SELECT team, played_on, outcome,
  outcome || ROW_NUMBER() OVER (PARTITION BY team, outcome, island ORDER BY played_on) AS streak
FROM islands
ORDER BY team, played_on;
```

## Expected result

| team | played_on | outcome | streak |
| --- | --- | --- | --- |
| Lions | 2025-03-02 | L | L1 |
| Lions | 2025-03-04 | L | L2 |
| Lions | 2025-03-06 | W | W1 |
| Lions | 2025-03-08 | L | L1 |
| Tigers | 2025-03-01 | W | W1 |
| Tigers | 2025-03-03 | W | W2 |
| Tigers | 2025-03-05 | L | L1 |
| Tigers | 2025-03-07 | W | W1 |
| Tigers | 2025-03-09 | W | W2 |
| Tigers | 2025-03-11 | W | W3 |

## Explanation

A running streak restarts every time the outcome changes. The difference of two row numbers (all games, and games with the same outcome) is constant through a run of one outcome and changes when the run breaks; numbering the rows within each run gives the streak so far.

The Tigers won twice, lost once, then won three in a row: `W3` after their last game. The Lions' single win between losses is a streak of one, and their final loss starts a new `L1` rather than continuing the earlier `L2`.

**Common mistake:** numbering wins and losses without the island key. Every win continues the count across losses, so the Tigers' last game shows `W5` instead of `W3`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH results(team, played_on, outcome) AS ( VALUES ('Tigers', '2025-03-01', 'W'), ('Tigers', '2025-03-03', 'W'), ('Tigers', '2025-03-05', 'L'), ('Tigers', '2025-03-07', 'W'), ('Tigers', '2025-03-09', 'W'), ('Tigers', '2025-03-11', 'W'), ('Lions', '2025-03-02', 'L'), ('Lions', '2025-03-04', 'L'), ('Lions', '2025-03-06', 'W'), ('Lions', '2025-03-08', 'L') ) SELECT team, played_on, outcome, outcome || ROW_NUMBER() OVER (PARTITION BY team, outcome ORDER BY played_on) AS streak FROM results ORDER BY team, played_on;
```
