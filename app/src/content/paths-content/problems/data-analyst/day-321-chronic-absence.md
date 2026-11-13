---
id: da-day-321
title: Attendance rates and chronic absence
order: 321
difficulty: intermediate
topic: Education analytics
summary: Compute attendance rates per student and class, and flag chronically absent students.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Flag students against a threshold
  - Weight rates by days
prerequisites:
  - Day 260
  - Day 290
---

## Task

A school calls a student **chronically absent** when they miss **10% or more** of school days. From the term's attendance (starter query), return one row per class: `class`, `students` (with at least one school day), `attendance_pct` (days present ÷ school days across the class, rounded to 1 decimal place), `chronically_absent` and `chronic_names` (their names in alphabetical order, separated by `', '`, `NULL` if none). Students with 0 school days (enrolled after term) are left out. Sort by `class`.

## Starter query

```sql
WITH attendance(student, class, school_days, days_present) AS (
  VALUES
    ('Aarav', '8A', 60, 58), ('Diya', '8A', 60, 51), ('Kabir', '8A', 60, 49), ('Meher', '8A', 60, 60), ('Rohan', '8B', 60, 44),
    ('Sara', '8B', 60, 54), ('Tanvi', '8B', 60, 53), ('Vivaan', '8B', 54, 50), ('Zoya', '8B', 0, 0)
)
SELECT student, class, school_days, days_present
FROM attendance
ORDER BY class, student;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter out students with `school_days = 0`, then flag `days_present < 0.9 * school_days` (missing 10% or more means present on at most 90%: use `<=`).
3. Class attendance is `SUM(days_present) / SUM(school_days)`, weighted by days. List names with `GROUP_CONCAT` over a sorted subquery of chronic students and `LEFT JOIN` it to the class totals.

## Solution

```sql
WITH attendance(student, class, school_days, days_present) AS (
  VALUES
    ('Aarav', '8A', 60, 58), ('Diya', '8A', 60, 51), ('Kabir', '8A', 60, 49), ('Meher', '8A', 60, 60), ('Rohan', '8B', 60, 44),
    ('Sara', '8B', 60, 54), ('Tanvi', '8B', 60, 53), ('Vivaan', '8B', 54, 50), ('Zoya', '8B', 0, 0)
),
enrolled AS (
  SELECT student, class, school_days, days_present, days_present <= 0.9 * school_days AS chronic
  FROM attendance
  WHERE school_days > 0
),
names AS (
  SELECT class, GROUP_CONCAT(student, ', ') AS chronic_names
  FROM (SELECT class, student FROM enrolled WHERE chronic ORDER BY class, student)
  GROUP BY class
)
SELECT e.class, COUNT(*) AS students, ROUND(100.0 * SUM(e.days_present) / SUM(e.school_days), 1) AS attendance_pct,
  SUM(e.chronic) AS chronically_absent, n.chronic_names
FROM enrolled AS e
LEFT JOIN names AS n ON n.class = e.class
GROUP BY e.class, n.chronic_names
ORDER BY e.class;
```

## Expected result

| class | students | attendance_pct | chronically_absent | chronic_names |
| --- | --- | --- | --- | --- |
| 8A | 4 | 90.8 | 2 | Diya, Kabir |
| 8B | 4 | 85.9 | 3 | Rohan, Sara, Tanvi |

## Explanation

Chronic absence is defined on the share of days missed: missing 10% or more means being present on at most 90% of school days. Sara was present on exactly 54 of 60 days, 90%, so she has missed 10% and counts as chronically absent; the comparison has to be `<=`.

Class attendance is weighted by days (total days present ÷ total school days), so a student who joined late with fewer school days counts less. Zoya has no school days yet and is left out, because 0 of 0 is not an attendance rate. Listing names next to the counts turns the report into a list for the class teacher.

**Common mistake:** using `<` against 90%. Students exactly at the threshold, like Sara, are missed, and they are the ones closest to falling further behind.

## Wrong answers

Feedback: incorrect-output

```sql
WITH attendance(student, class, school_days, days_present) AS ( VALUES ('Aarav', '8A', 60, 58), ('Diya', '8A', 60, 51), ('Kabir', '8A', 60, 49), ('Meher', '8A', 60, 60), ('Rohan', '8B', 60, 44), ('Sara', '8B', 60, 54), ('Tanvi', '8B', 60, 53), ('Vivaan', '8B', 54, 50), ('Zoya', '8B', 0, 0) ), enrolled AS (SELECT student, class, school_days, days_present, days_present < 0.9 * school_days AS chronic FROM attendance WHERE school_days > 0), names AS (SELECT class, GROUP_CONCAT(student, ', ') AS chronic_names FROM (SELECT class, student FROM enrolled WHERE chronic ORDER BY class, student) GROUP BY class) SELECT e.class, COUNT(*) AS students, ROUND(100.0 * SUM(e.days_present) / SUM(e.school_days), 1) AS attendance_pct, SUM(e.chronic) AS chronically_absent, n.chronic_names FROM enrolled AS e LEFT JOIN names AS n ON n.class = e.class GROUP BY e.class, n.chronic_names ORDER BY e.class;
```
