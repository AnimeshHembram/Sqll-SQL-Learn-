---
id: da-day-322
title: Grade bands and pass rates by subject
order: 322
difficulty: intermediate
topic: Education analytics
summary: Turn marks into grade bands, count each band per subject in one row, and compute pass rates.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot counts with conditional sums
  - Map scores to grade bands
prerequisites:
  - Day 59
  - Day 246
---

## Task

Marks (starter query) map to grades: **A** 80 and above, **B** 65-79, **C** 50-64, **D** 40-49 and **F** below 40. A pass is 40 or more. For each subject, return one row with `subject`, `students`, the count of each grade in columns `a`, `b`, `c`, `d` and `f`, `pass_pct` (rounded to 1 decimal place) and `avg_score` (rounded to 1 decimal place). Sort by `pass_pct` from highest, then `subject`.

## Starter query

```sql
WITH marks(student, subject, score) AS (
  VALUES
    ('Aarav', 'Maths', 78), ('Diya', 'Maths', 45), ('Kabir', 'Maths', 32), ('Meher', 'Maths', 91), ('Rohan', 'Maths', 66),
    ('Aarav', 'Science', 82), ('Diya', 'Science', 71), ('Kabir', 'Science', 58), ('Meher', 'Science', 88), ('Rohan', 'Science', 39),
    ('Aarav', 'English', 74), ('Diya', 'English', 80), ('Kabir', 'English', 69), ('Meher', 'English', 77), ('Rohan', 'English', 85)
)
SELECT student, subject, score
FROM marks
ORDER BY subject, score DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count each grade with a condition: `SUM(score >= 80) AS a`, `SUM(score BETWEEN 65 AND 79) AS b`, and so on.
3. `SUM(score >= 40)` passes; divide by `COUNT(*)`.

## Solution

```sql
WITH marks(student, subject, score) AS (
  VALUES
    ('Aarav', 'Maths', 78), ('Diya', 'Maths', 45), ('Kabir', 'Maths', 32), ('Meher', 'Maths', 91), ('Rohan', 'Maths', 66),
    ('Aarav', 'Science', 82), ('Diya', 'Science', 71), ('Kabir', 'Science', 58), ('Meher', 'Science', 88), ('Rohan', 'Science', 39),
    ('Aarav', 'English', 74), ('Diya', 'English', 80), ('Kabir', 'English', 69), ('Meher', 'English', 77), ('Rohan', 'English', 85)
)
SELECT subject, COUNT(*) AS students,
  SUM(score >= 80) AS a, SUM(score BETWEEN 65 AND 79) AS b, SUM(score BETWEEN 50 AND 64) AS c, SUM(score BETWEEN 40 AND 49) AS d, SUM(score < 40) AS f,
  ROUND(100.0 * SUM(score >= 40) / COUNT(*), 1) AS pass_pct, ROUND(AVG(score), 1) AS avg_score
FROM marks
GROUP BY subject
ORDER BY pass_pct DESC, subject;
```

## Expected result

| subject | students | a | b | c | d | f | pass_pct | avg_score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| English | 5 | 2 | 3 | 0 | 0 | 0 | 100 | 77 |
| Maths | 5 | 1 | 2 | 0 | 1 | 1 | 80 | 62.4 |
| Science | 5 | 2 | 1 | 1 | 0 | 1 | 80 | 67.6 |

## Explanation

Conditional sums turn grade bands into columns: `SUM(score >= 80)` counts the A grades because the comparison is 1 or 0 for each student. Getting the bands right means making them touch without overlapping: B is 65 to 79, so 80 is an A and 79 a B.

English has no failures and two A grades; Maths has the widest spread, with one A, one D and one F, and the lowest average. Pass rates alone (80% in both Maths and Science) hide that difference, which is why the distribution is shown next to them.

**Common mistake:** bands that overlap at the edges, such as `score > 80` for A and `BETWEEN 65 AND 80` for B. Diya's English score of 80 is then counted as a B, and every boundary score lands in the wrong column.

## Wrong answers

Feedback: incorrect-output

```sql
WITH marks(student, subject, score) AS ( VALUES ('Aarav', 'Maths', 78), ('Diya', 'Maths', 45), ('Kabir', 'Maths', 32), ('Meher', 'Maths', 91), ('Rohan', 'Maths', 66), ('Aarav', 'Science', 82), ('Diya', 'Science', 71), ('Kabir', 'Science', 58), ('Meher', 'Science', 88), ('Rohan', 'Science', 39), ('Aarav', 'English', 74), ('Diya', 'English', 80), ('Kabir', 'English', 69), ('Meher', 'English', 77), ('Rohan', 'English', 85) ) SELECT subject, COUNT(*) AS students, SUM(score > 80) AS a, SUM(score BETWEEN 65 AND 80) AS b, SUM(score BETWEEN 50 AND 65) AS c, SUM(score BETWEEN 40 AND 50) AS d, SUM(score < 40) AS f, ROUND(100.0 * SUM(score >= 40) / COUNT(*), 1) AS pass_pct, ROUND(AVG(score), 1) AS avg_score FROM marks GROUP BY subject ORDER BY pass_pct DESC, subject;
```
