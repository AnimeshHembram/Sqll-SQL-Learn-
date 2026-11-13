---
id: da-day-263
title: When is everyone free?
order: 263
difficulty: advanced
topic: Gaps and islands
summary: Merge everyone's busy times and find the free gaps of at least 30 minutes in the working day.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Merge overlapping intervals
  - Find gaps between intervals
prerequisites:
  - Day 157
  - Day 202
---

## Task

Asha, Ravi and Meera need a meeting (their calendars are in the starter query). The working day runs from **09:00 to 17:00**. Find the gaps in which **nobody** is busy that last at least 30 minutes.

Return `free_from`, `free_to` and `minutes`, sorted by `free_from`. Times are `'HH:MM'` text, which sorts correctly.

## Starter query

```sql
WITH meetings(person, starts, ends) AS (
  VALUES
    ('Asha', '09:00', '10:00'), ('Asha', '11:30', '12:30'), ('Asha', '15:00', '16:00'),
    ('Ravi', '09:30', '10:30'), ('Ravi', '13:00', '13:30'), ('Ravi', '15:30', '16:30'),
    ('Meera', '12:00', '14:30')
)
SELECT person, starts, ends
FROM meetings
ORDER BY starts;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Merge overlapping meetings first, whoever they belong to: sort by start, and a meeting starts a new busy block when it starts after the latest end so far (`MAX(ends) OVER (ORDER BY starts, ends ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)`). A running sum of those starts numbers the blocks.
3. Add two zero-length blocks at 09:00 and 17:00, then pair each block's end with the next block's start using `LEAD`. Minutes between `'HH:MM'` times: `(julianday('2025-01-01 ' || b) - julianday('2025-01-01 ' || a)) * 1440`.

## Solution

```sql
WITH meetings(person, starts, ends) AS (
  VALUES
    ('Asha', '09:00', '10:00'), ('Asha', '11:30', '12:30'), ('Asha', '15:00', '16:00'),
    ('Ravi', '09:30', '10:30'), ('Ravi', '13:00', '13:30'), ('Ravi', '15:30', '16:30'),
    ('Meera', '12:00', '14:30')
),
ordered AS (
  SELECT starts, ends,
    MAX(ends) OVER (ORDER BY starts, ends ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
  FROM meetings
),
flagged AS (
  SELECT starts, ends, CASE WHEN prev_end IS NULL OR starts > prev_end THEN 1 ELSE 0 END AS new_block FROM ordered
),
numbered AS (
  SELECT starts, ends, SUM(new_block) OVER (ORDER BY starts, ends) AS block FROM flagged
),
busy AS (
  SELECT MIN(starts) AS starts, MAX(ends) AS ends FROM numbered GROUP BY block
  UNION ALL SELECT '09:00', '09:00'
  UNION ALL SELECT '17:00', '17:00'
),
gaps AS (
  SELECT ends AS free_from, LEAD(starts) OVER (ORDER BY starts, ends) AS free_to FROM busy
)
SELECT free_from, free_to,
  CAST(ROUND((julianday('2025-01-01 ' || free_to) - julianday('2025-01-01 ' || free_from)) * 1440) AS INTEGER) AS minutes
FROM gaps
WHERE free_to IS NOT NULL
  AND (julianday('2025-01-01 ' || free_to) - julianday('2025-01-01 ' || free_from)) * 1440 >= 29.99
ORDER BY free_from;
```

## Expected result

| free_from | free_to | minutes |
| --- | --- | --- |
| 10:30 | 11:30 | 60 |
| 14:30 | 15:00 | 30 |
| 16:30 | 17:00 | 30 |

## Explanation

Free time is what is left after merging everyone's busy time. Merging first is essential: Asha's 9:00 and Ravi's 9:30 meetings overlap, and Meera's long meeting from 12:00 to 14:30 overlaps Asha's 11:30 meeting and completely contains Ravi's 13:00 one, so the day has three busy blocks: 9:00-10:30, 11:30-14:30 and 15:00-16:30. A meeting starts a new block when it starts after every earlier meeting has ended, which a running `MAX(ends)` over the earlier rows tells you.

The two zero-length blocks at 9:00 and 17:00 act as bookends, so free time at the start or end of the day would be found too. Here the free slots are 10:30-11:30 (an hour), 14:30-15:00 and 16:30-17:00 (half an hour each). Times as `'HH:MM'` text sort correctly and can be turned into minutes with `julianday` on any fixed date.

**Common mistake:** looking for gaps between individual meetings without merging. Overlapping meetings create negative "gaps" and false free slots, such as 90 minutes from 13:30, when Ravi's short meeting ends, although Meera is busy until 14:30.

## Wrong answers

Feedback: incorrect-output

```sql
WITH meetings(person, starts, ends) AS ( VALUES ('Asha', '09:00', '10:00'), ('Asha', '11:30', '12:30'), ('Asha', '15:00', '16:00'), ('Ravi', '09:30', '10:30'), ('Ravi', '13:00', '13:30'), ('Ravi', '15:30', '16:30'), ('Meera', '12:00', '14:30') ), busy AS (SELECT starts, ends FROM meetings UNION ALL SELECT '09:00', '09:00' UNION ALL SELECT '17:00', '17:00'), gaps AS (SELECT ends AS free_from, LEAD(starts) OVER (ORDER BY starts, ends) AS free_to FROM busy) SELECT free_from, free_to, CAST(ROUND((julianday('2025-01-01 ' || free_to) - julianday('2025-01-01 ' || free_from)) * 1440) AS INTEGER) AS minutes FROM gaps WHERE free_to IS NOT NULL AND (julianday('2025-01-01 ' || free_to) - julianday('2025-01-01 ' || free_from)) * 1440 >= 29.99 ORDER BY free_from;
```
