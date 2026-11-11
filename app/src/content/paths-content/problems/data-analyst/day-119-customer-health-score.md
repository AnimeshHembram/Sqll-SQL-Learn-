---
id: da-day-119
title: Case study: a customer health score
order: 119
difficulty: advanced
topic: Case studies
summary: Combine usage, support and survey data into a score, treating missing data deliberately.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Combine several metrics into a weighted score
  - State and apply rules for missing data
prerequisites:
  - Day 76
  - Day 114
---

## Task

Customer success scores each account (all data in the starter query) out of 100:

- **Usage (40 points)**: the average weekly active users over the **four weeks W10 to W13** divided by seats. A week with no row counts as **0 active users**. Ratio 0.7 or more: 40; 0.4 or more: 20; otherwise 0.
- **Support (30 points)**: tickets opened in March 2025. None: 30; one or two: 15; three or more: 0.
- **NPS (30 points)**: 9 or 10: 30; 7 or 8: 15; 6 or less: 0; no answer: 15.

Return `account`, `usage_ratio` (rounded to 2 decimal places), `march_tickets`, `nps`, `score` and `health`: `'healthy'` from 70, `'watch'` from 40, otherwise `'at risk'`. Sort by `score` from highest to lowest, then `account`.

## Starter query

```sql
WITH accounts(account, seats) AS (
  VALUES ('Acme', 10), ('Bolt', 20), ('Cora', 5), ('Dyna', 8), ('Echo', 12)
),
usage(account, week, active_users) AS (
  VALUES
    ('Acme', '2025-W10', 8), ('Acme', '2025-W11', 7), ('Acme', '2025-W12', 9), ('Acme', '2025-W13', 8),
    ('Bolt', '2025-W10', 6), ('Bolt', '2025-W11', 5), ('Bolt', '2025-W12', 7), ('Bolt', '2025-W13', 6),
    ('Cora', '2025-W10', 3), ('Cora', '2025-W11', 2), ('Cora', '2025-W12', 2), ('Cora', '2025-W13', 3),
    ('Dyna', '2025-W10', 6), ('Dyna', '2025-W11', 6), ('Dyna', '2025-W12', 5), ('Dyna', '2025-W13', 7),
    ('Echo', '2025-W12', 9), ('Echo', '2025-W13', 10)
),
support_tickets(account, opened_on) AS (
  VALUES
    ('Acme', '2025-03-05'),
    ('Bolt', '2025-02-20'), ('Bolt', '2025-03-03'), ('Bolt', '2025-03-11'), ('Bolt', '2025-03-25'),
    ('Dyna', '2025-03-07'), ('Dyna', '2025-03-19'),
    ('Echo', '2025-03-28')
),
nps(account, score) AS (
  VALUES ('Acme', 9), ('Bolt', 6), ('Cora', NULL), ('Dyna', 8), ('Echo', 10)
)
SELECT a.account, a.seats, n.score AS nps
FROM accounts AS a
LEFT JOIN nps AS n ON n.account = a.account;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Make one CTE per ingredient, each with one row per account, and join them to `accounts`.
2. Divide the **sum** of active users by 4, not by the number of rows: `SUM(active_users) / 4.0 / a.seats`. Count tickets with `LEFT JOIN` and `COUNT(t.account)` so accounts without tickets get 0.
3. Score each part with a `CASE` (put `WHEN n.score IS NULL THEN 15` first), add them, and calculate `health` from the total in a final step.

## Solution

```sql
WITH accounts(account, seats) AS (
  VALUES ('Acme', 10), ('Bolt', 20), ('Cora', 5), ('Dyna', 8), ('Echo', 12)
),
usage(account, week, active_users) AS (
  VALUES
    ('Acme', '2025-W10', 8), ('Acme', '2025-W11', 7), ('Acme', '2025-W12', 9), ('Acme', '2025-W13', 8),
    ('Bolt', '2025-W10', 6), ('Bolt', '2025-W11', 5), ('Bolt', '2025-W12', 7), ('Bolt', '2025-W13', 6),
    ('Cora', '2025-W10', 3), ('Cora', '2025-W11', 2), ('Cora', '2025-W12', 2), ('Cora', '2025-W13', 3),
    ('Dyna', '2025-W10', 6), ('Dyna', '2025-W11', 6), ('Dyna', '2025-W12', 5), ('Dyna', '2025-W13', 7),
    ('Echo', '2025-W12', 9), ('Echo', '2025-W13', 10)
),
support_tickets(account, opened_on) AS (
  VALUES
    ('Acme', '2025-03-05'),
    ('Bolt', '2025-02-20'), ('Bolt', '2025-03-03'), ('Bolt', '2025-03-11'), ('Bolt', '2025-03-25'),
    ('Dyna', '2025-03-07'), ('Dyna', '2025-03-19'),
    ('Echo', '2025-03-28')
),
nps(account, score) AS (
  VALUES ('Acme', 9), ('Bolt', 6), ('Cora', NULL), ('Dyna', 8), ('Echo', 10)
),
usage_ratio AS (
  SELECT a.account, COALESCE(SUM(u.active_users), 0) / 4.0 / a.seats AS ratio
  FROM accounts AS a
  LEFT JOIN usage AS u ON u.account = a.account AND u.week BETWEEN '2025-W10' AND '2025-W13'
  GROUP BY a.account, a.seats
),
march_tickets AS (
  SELECT a.account, COUNT(t.account) AS tickets
  FROM accounts AS a
  LEFT JOIN support_tickets AS t ON t.account = a.account AND t.opened_on BETWEEN '2025-03-01' AND '2025-03-31'
  GROUP BY a.account
),
scored AS (
  SELECT a.account, u.ratio, t.tickets, n.score AS nps,
    CASE WHEN u.ratio >= 0.7 THEN 40 WHEN u.ratio >= 0.4 THEN 20 ELSE 0 END
    + CASE WHEN t.tickets = 0 THEN 30 WHEN t.tickets <= 2 THEN 15 ELSE 0 END
    + CASE WHEN n.score IS NULL THEN 15 WHEN n.score >= 9 THEN 30 WHEN n.score >= 7 THEN 15 ELSE 0 END AS score
  FROM accounts AS a
  JOIN usage_ratio AS u ON u.account = a.account
  JOIN march_tickets AS t ON t.account = a.account
  LEFT JOIN nps AS n ON n.account = a.account
)
SELECT account, ROUND(ratio, 2) AS usage_ratio, tickets AS march_tickets, nps, score,
  CASE WHEN score >= 70 THEN 'healthy' WHEN score >= 40 THEN 'watch' ELSE 'at risk' END AS health
FROM scored
ORDER BY score DESC, account;
```

## Expected result

| account | usage_ratio | march_tickets | nps | score | health |
| --- | --- | --- | --- | --- | --- |
| Acme | 0.8 | 1 | 9 | 85 | healthy |
| Dyna | 0.75 | 2 | 8 | 70 | healthy |
| Cora | 0.5 | 0 | NULL | 65 | watch |
| Echo | 0.4 | 1 | 10 | 45 | watch |
| Bolt | 0.3 | 3 | 6 | 0 | at risk |

## Explanation

Scores like this are only as good as their treatment of missing data, so the rules state it explicitly. Echo only has usage rows for the last two weeks: averaging the rows it has would give 0.79 and 40 points, but a missing week means nobody used the product, so its ratio is 19 / 4 / 12 = 0.40 (0.396 before rounding) and it earns 0, because the threshold is compared with the unrounded ratio. Cora never answered the survey, so she gets the neutral 15 points rather than 0 or 30.

Dyna scores exactly 70, the boundary, and is healthy. Bolt is at risk on every measure.

**Common mistakes:** `AVG(active_users)`, which ignores missing weeks; and `COUNT(*)` for tickets after a `LEFT JOIN`, which gives Cora 1 instead of 0.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, seats) AS ( VALUES ('Acme', 10), ('Bolt', 20), ('Cora', 5), ('Dyna', 8), ('Echo', 12) ), usage(account, week, active_users) AS ( VALUES ('Acme', '2025-W10', 8), ('Acme', '2025-W11', 7), ('Acme', '2025-W12', 9), ('Acme', '2025-W13', 8), ('Bolt', '2025-W10', 6), ('Bolt', '2025-W11', 5), ('Bolt', '2025-W12', 7), ('Bolt', '2025-W13', 6), ('Cora', '2025-W10', 3), ('Cora', '2025-W11', 2), ('Cora', '2025-W12', 2), ('Cora', '2025-W13', 3), ('Dyna', '2025-W10', 6), ('Dyna', '2025-W11', 6), ('Dyna', '2025-W12', 5), ('Dyna', '2025-W13', 7), ('Echo', '2025-W12', 9), ('Echo', '2025-W13', 10) ), support_tickets(account, opened_on) AS ( VALUES ('Acme', '2025-03-05'), ('Bolt', '2025-02-20'), ('Bolt', '2025-03-03'), ('Bolt', '2025-03-11'), ('Bolt', '2025-03-25'), ('Dyna', '2025-03-07'), ('Dyna', '2025-03-19'), ('Echo', '2025-03-28') ), nps(account, score) AS ( VALUES ('Acme', 9), ('Bolt', 6), ('Cora', NULL), ('Dyna', 8), ('Echo', 10) ), usage_ratio AS (SELECT a.account, AVG(u.active_users) / a.seats AS ratio FROM accounts AS a LEFT JOIN usage AS u ON u.account = a.account GROUP BY a.account, a.seats), march_tickets AS (SELECT a.account, COUNT(t.account) AS tickets FROM accounts AS a LEFT JOIN support_tickets AS t ON t.account = a.account AND t.opened_on BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY a.account), scored AS (SELECT a.account, u.ratio, t.tickets, n.score AS nps, CASE WHEN u.ratio >= 0.7 THEN 40 WHEN u.ratio >= 0.4 THEN 20 ELSE 0 END + CASE WHEN t.tickets = 0 THEN 30 WHEN t.tickets <= 2 THEN 15 ELSE 0 END + CASE WHEN n.score IS NULL THEN 15 WHEN n.score >= 9 THEN 30 WHEN n.score >= 7 THEN 15 ELSE 0 END AS score FROM accounts AS a JOIN usage_ratio AS u ON u.account = a.account JOIN march_tickets AS t ON t.account = a.account LEFT JOIN nps AS n ON n.account = a.account) SELECT account, ROUND(ratio, 2) AS usage_ratio, tickets AS march_tickets, nps, score, CASE WHEN score >= 70 THEN 'healthy' WHEN score >= 40 THEN 'watch' ELSE 'at risk' END AS health FROM scored ORDER BY score DESC, account;
```
