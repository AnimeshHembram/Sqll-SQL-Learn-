---
id: da-day-325
title: Who improved between terms?
order: 325
difficulty: intermediate
topic: Education analytics
summary: Pair each student's two term scores, rank the improvements, and leave out students with one score.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pair repeated measurements
  - Rank changes with ties
prerequisites:
  - Day 124
  - Day 101
---

## Task

Compare each student's **T1** and **T2** scores (starter query). Students without both scores are left out. Return `student`, `t1`, `t2`, `change` and `rank` (rank by change, highest improvement first; equal changes share a rank), and a final row `student` = `'Average'` with the average of each column rounded to 1 decimal place (`rank` `NULL`). Sort by `rank`, with the average last.

## Starter query

```sql
WITH scores(student, term, score) AS (
  VALUES
    ('Aarav', 'T1', 62), ('Aarav', 'T2', 71), ('Diya', 'T1', 75), ('Diya', 'T2', 73), ('Kabir', 'T1', 48), ('Kabir', 'T2', 61),
    ('Meher', 'T1', 88), ('Meher', 'T2', 90), ('Rohan', 'T1', 55), ('Rohan', 'T2', 68), ('Sara', 'T1', 70)
)
SELECT student, term, score
FROM scores
ORDER BY student, term;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pivot the two terms per student with conditional `MAX` and keep rows where both are present (`HAVING` both not `NULL`).
3. `RANK() OVER (ORDER BY t2 - t1 DESC)` lets equal changes share a rank. Add the average row with `UNION ALL` in a subquery so you can sort with `rank IS NULL`.

## Solution

```sql
WITH scores(student, term, score) AS (
  VALUES
    ('Aarav', 'T1', 62), ('Aarav', 'T2', 71), ('Diya', 'T1', 75), ('Diya', 'T2', 73), ('Kabir', 'T1', 48), ('Kabir', 'T2', 61),
    ('Meher', 'T1', 88), ('Meher', 'T2', 90), ('Rohan', 'T1', 55), ('Rohan', 'T2', 68), ('Sara', 'T1', 70)
),
paired AS (
  SELECT student, MAX(CASE WHEN term = 'T1' THEN score END) AS t1, MAX(CASE WHEN term = 'T2' THEN score END) AS t2
  FROM scores
  GROUP BY student
  HAVING MAX(CASE WHEN term = 'T1' THEN score END) IS NOT NULL AND MAX(CASE WHEN term = 'T2' THEN score END) IS NOT NULL
),
ranked AS (
  SELECT student, t1, t2, t2 - t1 AS change, RANK() OVER (ORDER BY t2 - t1 DESC) AS rnk FROM paired
)
SELECT student, t1, t2, change, rnk AS "rank" FROM (
  SELECT student, t1, t2, change, rnk FROM ranked
  UNION ALL
  SELECT 'Average', ROUND(AVG(t1), 1), ROUND(AVG(t2), 1), ROUND(AVG(change), 1), NULL FROM ranked
)
ORDER BY rnk IS NULL, rnk, student;
```

## Expected result

| student | t1 | t2 | change | rank |
| --- | --- | --- | --- | --- |
| Kabir | 48 | 61 | 13 | 1 |
| Rohan | 55 | 68 | 13 | 1 |
| Aarav | 62 | 71 | 9 | 3 |
| Meher | 88 | 90 | 2 | 4 |
| Diya | 75 | 73 | -2 | 5 |
| Average | 65.6 | 72.6 | 7 | NULL |

## Explanation

Comparing two terms needs both scores for the same student, so the data is pivoted to one row per student and students with only one score (Sara) are left out with `HAVING`. `RANK()` lets Kabir and Rohan share first place with the same improvement of 13 marks, and the next student is third, not second.

On average students improved by 7 marks, but Diya went down by 2. The average row is computed from the same paired students, so its T1 and T2 averages and its average change are consistent with each other.

**Common mistake:** `ROW_NUMBER()` instead of `RANK()`. Kabir and Rohan get ranks 1 and 2 depending on an arbitrary order, so one of them is told they came second for exactly the same improvement.

## Wrong answers

Feedback: incorrect-output

```sql
WITH scores(student, term, score) AS ( VALUES ('Aarav', 'T1', 62), ('Aarav', 'T2', 71), ('Diya', 'T1', 75), ('Diya', 'T2', 73), ('Kabir', 'T1', 48), ('Kabir', 'T2', 61), ('Meher', 'T1', 88), ('Meher', 'T2', 90), ('Rohan', 'T1', 55), ('Rohan', 'T2', 68), ('Sara', 'T1', 70) ), paired AS (SELECT student, MAX(CASE WHEN term = 'T1' THEN score END) AS t1, MAX(CASE WHEN term = 'T2' THEN score END) AS t2 FROM scores GROUP BY student HAVING COUNT(*) = 2), ranked AS (SELECT student, t1, t2, t2 - t1 AS change, ROW_NUMBER() OVER (ORDER BY t2 - t1 DESC) AS rnk FROM paired) SELECT student, t1, t2, change, rnk AS "rank" FROM (SELECT student, t1, t2, change, rnk FROM ranked UNION ALL SELECT 'Average', ROUND(AVG(t1), 1), ROUND(AVG(t2), 1), ROUND(AVG(change), 1), NULL FROM ranked) ORDER BY rnk IS NULL, rnk, student;
```
