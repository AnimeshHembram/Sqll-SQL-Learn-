---
id: da-day-068
title: Find duplicate sign-ups
order: 68
difficulty: intermediate
topic: Data quality
summary: Find repeated keys in an import, ignoring differences in capital letters.
module: data-analyst
duration: 8
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Find duplicates with GROUP BY and HAVING
  - Normalise text before comparing
prerequisites:
  - Day 13
  - Day 52
---

## Task

A newsletter import arrived as a list (in the starter query). The same person can appear more than once, sometimes with their email in different capitals. Return each email that appears **more than once**, in lower case, as `email`, with `copies` (how many times it appears). Row order does not matter.

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

1. Keep the `WITH signups ...` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Group by the email in lower case, `lower(email)`, so `NINA@example.com` and `nina@example.com` are the same.
3. `SELECT lower(email) AS email, COUNT(*) AS copies FROM signups GROUP BY lower(email) HAVING COUNT(*) > 1`

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
)
SELECT lower(email) AS email, COUNT(*) AS copies
FROM signups
GROUP BY lower(email)
HAVING COUNT(*) > 1;
```

## Expected result

| email | copies |
| --- | --- |
| aisha@example.com | 2 |
| nina@example.com | 2 |
| rahul@example.com | 3 |

## Explanation

Rahul's address appears three times, and Aisha's and Nina's twice. Without `lower`, Nina's two rows would look like two different people. Email addresses are not case-sensitive in practice, so normalise them before comparing.

## Wrong answers

Feedback: missing-rows

```sql
WITH signups(email, name, signed_up) AS (   VALUES     ('aisha@example.com', 'Aisha Khan',  '2025-04-01'),     ('rahul@example.com', 'Rahul Mehta', '2025-04-02'),     ('aisha@example.com', 'Aisha K.',    '2025-04-05'),     ('nina@example.com',  'Nina Shah',   '2025-04-06'),     ('rahul@example.com', 'Rahul Mehta', '2025-04-09'),     ('rahul@example.com', 'R. Mehta',    '2025-04-12'),     ('omar@example.com',  'Omar Ali',    '2025-04-15'),     ('NINA@example.com',  'Nina Shah',   '2025-04-20') ) SELECT email, COUNT(*) AS copies FROM signups GROUP BY email HAVING COUNT(*) > 1;
```
