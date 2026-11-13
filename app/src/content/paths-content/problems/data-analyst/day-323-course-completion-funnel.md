---
id: da-day-323
title: Where learners drop out of a course
order: 323
difficulty: intermediate
topic: Education analytics
summary: Count learners who reached each lesson of a five-lesson course, including those who never started.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a completion funnel
  - Use the right denominators
prerequisites:
  - Day 306
  - Day 156
---

## Task

A five-lesson online course (starter query) records each lesson a learner completed. A learner **reached** lesson `n` if they completed lesson `n` (learners occasionally skip ahead, so do not assume they completed earlier lessons). For lessons 1 to 5, return `lesson`, `learners` (who completed it), `pct_of_enrolled` (÷ all enrolled learners) and `pct_of_previous` (÷ learners who completed the previous lesson, `NULL` for lesson 1). Round to 1 decimal place. Sort by `lesson`.

## Starter query

```sql
WITH enrolments(learner, enrolled_on) AS (
  VALUES ('l1', '2025-01-05'), ('l2', '2025-01-06'), ('l3', '2025-01-08'), ('l4', '2025-01-10'), ('l5', '2025-01-12'),
         ('l6', '2025-01-15'), ('l7', '2025-01-18'), ('l8', '2025-01-20')
),
lessons_done(learner, lesson) AS (
  VALUES
    ('l1', 1), ('l1', 2), ('l1', 3), ('l1', 4), ('l1', 5), ('l2', 1), ('l2', 2), ('l3', 1), ('l3', 2), ('l3', 3), ('l3', 4),
    ('l4', 1), ('l5', 1), ('l5', 2), ('l5', 3), ('l5', 4), ('l5', 5), ('l6', 1), ('l6', 2), ('l6', 3), ('l8', 2)
)
SELECT e.learner, e.enrolled_on, d.lesson
FROM enrolments AS e
LEFT JOIN lessons_done AS d ON d.learner = e.learner
ORDER BY e.learner, d.lesson;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add the five lessons as `VALUES` so a lesson nobody completed still appears.
2. `LEFT JOIN` lessons to completions and `COUNT(DISTINCT d.learner)` per lesson. Divide by `(SELECT COUNT(*) FROM enrolments)`.
3. `LAG(learners) OVER (ORDER BY lesson)` gives the previous lesson's count.

## Solution

```sql
WITH enrolments(learner, enrolled_on) AS (
  VALUES ('l1', '2025-01-05'), ('l2', '2025-01-06'), ('l3', '2025-01-08'), ('l4', '2025-01-10'), ('l5', '2025-01-12'),
         ('l6', '2025-01-15'), ('l7', '2025-01-18'), ('l8', '2025-01-20')
),
lessons_done(learner, lesson) AS (
  VALUES
    ('l1', 1), ('l1', 2), ('l1', 3), ('l1', 4), ('l1', 5), ('l2', 1), ('l2', 2), ('l3', 1), ('l3', 2), ('l3', 3), ('l3', 4),
    ('l4', 1), ('l5', 1), ('l5', 2), ('l5', 3), ('l5', 4), ('l5', 5), ('l6', 1), ('l6', 2), ('l6', 3), ('l8', 2)
),
lessons(lesson) AS (
  VALUES (1), (2), (3), (4), (5)
),
counts AS (
  SELECT l.lesson, COUNT(DISTINCT d.learner) AS learners
  FROM lessons AS l
  LEFT JOIN lessons_done AS d ON d.lesson = l.lesson
  GROUP BY l.lesson
)
SELECT lesson, learners,
  ROUND(100.0 * learners / (SELECT COUNT(*) FROM enrolments), 1) AS pct_of_enrolled,
  ROUND(100.0 * learners / LAG(learners) OVER (ORDER BY lesson), 1) AS pct_of_previous
FROM counts
ORDER BY lesson;
```

## Expected result

| lesson | learners | pct_of_enrolled | pct_of_previous |
| --- | --- | --- | --- |
| 1 | 6 | 75 | NULL |
| 2 | 6 | 75 | 100 |
| 3 | 4 | 50 | 66.7 |
| 4 | 3 | 37.5 | 75 |
| 5 | 2 | 25 | 66.7 |

## Explanation

A completion funnel counts how many learners completed each lesson. Starting from a list of the five lessons keeps a lesson nobody finished in the report. Learner l8 completed lesson 2 without lesson 1 (they skipped ahead), which is why lesson 2 has as many learners as lesson 1: the task counts completions, not strict progression.

The two percentages answer different questions. Against all enrolled learners, only a quarter finished the course; against the previous lesson, lesson 3 is the steepest step, where a third of learners stopped. Two learners (l4 and l7) never got past lesson 1, or never started at all.

**Common mistake:** dividing by learners who completed at least one lesson instead of all enrolled learners. l7, who enrolled but never started, disappears from the denominator, and the course looks more successful than it is.

## Wrong answers

Feedback: incorrect-output

```sql
WITH enrolments(learner, enrolled_on) AS ( VALUES ('l1', '2025-01-05'), ('l2', '2025-01-06'), ('l3', '2025-01-08'), ('l4', '2025-01-10'), ('l5', '2025-01-12'), ('l6', '2025-01-15'), ('l7', '2025-01-18'), ('l8', '2025-01-20') ), lessons_done(learner, lesson) AS ( VALUES ('l1', 1), ('l1', 2), ('l1', 3), ('l1', 4), ('l1', 5), ('l2', 1), ('l2', 2), ('l3', 1), ('l3', 2), ('l3', 3), ('l3', 4), ('l4', 1), ('l5', 1), ('l5', 2), ('l5', 3), ('l5', 4), ('l5', 5), ('l6', 1), ('l6', 2), ('l6', 3), ('l8', 2) ), counts AS (SELECT lesson, COUNT(DISTINCT learner) AS learners FROM lessons_done GROUP BY lesson) SELECT lesson, learners, ROUND(100.0 * learners / (SELECT COUNT(DISTINCT learner) FROM lessons_done), 1) AS pct_of_enrolled, ROUND(100.0 * learners / LAG(learners) OVER (ORDER BY lesson), 1) AS pct_of_previous FROM counts ORDER BY lesson;
```
