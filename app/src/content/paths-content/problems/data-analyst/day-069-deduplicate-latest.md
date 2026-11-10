---
id: da-day-069
title: Keep only the latest sign-up per person
order: 69
difficulty: advanced
topic: Data quality
summary: Deduplicate rows by keeping the most recent one per key with ROW_NUMBER.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Deduplicate with ROW_NUMBER
  - Choose which duplicate to keep
prerequisites:
  - Day 68
  - Day 43
---

## Task

Now clean yesterday's import (in the starter query). Keep **one row per email** (compared in lower case): the most recent sign-up. Return `email` (lower case), `name` and `signed_up`. Row order does not matter.

## Starter query

```sql
WITH signups(email, name, signed_up) AS (
  VALUES
    ('aisha@example.com', 'Aisha Khan',  '2025-04-01'),
    ('rahul@example.com', 'Rahul Mehta', '2025-04-02'),
    ('aisha@example.com', 'Aisha K.',    '2025-04-05'),
    ('nina@example.com',  'Nina Shah',   '2025-04-06'),
    ('rahul@example.com', 'Rahul Mehta', '2025-04-09'),
    ('rahul@example.com', 'R. Mehta',    '2025-04-12'),
    ('omar@example.com',  'Omar Ali',    '2025-04-15'),
    ('NINA@example.com',  'Nina Shah',   '2025-04-20')
)
SELECT email, name, signed_up
FROM signups;
```

## Hints

1. Number the rows of each email from newest to oldest, then keep number 1.
2. `ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY signed_up DESC)` in a second CTE called `ranked`.
3. Add `ranked AS (SELECT lower(email) AS email, name, signed_up, ROW_NUMBER() OVER (...) AS rn FROM signups)` and `SELECT email, name, signed_up FROM ranked WHERE rn = 1`.

## Solution

```sql
WITH signups(email, name, signed_up) AS (
  VALUES
    ('aisha@example.com', 'Aisha Khan',  '2025-04-01'),
    ('rahul@example.com', 'Rahul Mehta', '2025-04-02'),
    ('aisha@example.com', 'Aisha K.',    '2025-04-05'),
    ('nina@example.com',  'Nina Shah',   '2025-04-06'),
    ('rahul@example.com', 'Rahul Mehta', '2025-04-09'),
    ('rahul@example.com', 'R. Mehta',    '2025-04-12'),
    ('omar@example.com',  'Omar Ali',    '2025-04-15'),
    ('NINA@example.com',  'Nina Shah',   '2025-04-20')
),
ranked AS (
  SELECT lower(email) AS email, name, signed_up,
    ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY signed_up DESC) AS rn
  FROM signups
)
SELECT email, name, signed_up
FROM ranked
WHERE rn = 1;
```

## Expected result

| email | name | signed_up |
| --- | --- | --- |
| aisha@example.com | Aisha K. | 2025-04-05 |
| nina@example.com | Nina Shah | 2025-04-20 |
| omar@example.com | Omar Ali | 2025-04-15 |
| rahul@example.com | R. Mehta | 2025-04-12 |

## Explanation

Eight rows become four people. `SELECT DISTINCT` would not help, because the duplicate rows differ in name and date. Choosing a rule (here: the latest row wins) and applying it with `ROW_NUMBER` is the standard way to deduplicate.

## Wrong answers

Feedback: extra-rows

```sql
WITH signups(email, name, signed_up) AS (   VALUES     ('aisha@example.com', 'Aisha Khan',  '2025-04-01'),     ('rahul@example.com', 'Rahul Mehta', '2025-04-02'),     ('aisha@example.com', 'Aisha K.',    '2025-04-05'),     ('nina@example.com',  'Nina Shah',   '2025-04-06'),     ('rahul@example.com', 'Rahul Mehta', '2025-04-09'),     ('rahul@example.com', 'R. Mehta',    '2025-04-12'),     ('omar@example.com',  'Omar Ali',    '2025-04-15'),     ('NINA@example.com',  'Nina Shah',   '2025-04-20') ) SELECT DISTINCT lower(email) AS email, name, signed_up FROM signups;
```
