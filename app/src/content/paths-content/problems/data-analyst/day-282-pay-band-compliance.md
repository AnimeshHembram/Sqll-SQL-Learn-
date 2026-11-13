---
id: da-day-282
title: Salaries against their pay bands
order: 282
difficulty: intermediate
topic: Workforce analytics
summary: Compute each salary's compa-ratio, flag salaries outside their band, and catch grades with no band.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare values with a band
  - Compute a compa-ratio
prerequisites:
  - Day 92
  - Day 247
---

## Task

Each grade has a pay band (starter query). For every employee, return:

- `compa_ratio`: salary ÷ band midpoint, rounded to 2 decimal places (`NULL` when the grade has no band),
- `position`: `'below band'` under the minimum, `'above band'` over the maximum, `'in band'` otherwise, or `'no band'` when the grade is not in the band table.

Return `name`, `grade`, `salary`, `compa_ratio` and `position`, sorted by `compa_ratio` from lowest (no band last), then `name`.

## Starter query

```sql
WITH bands(grade, band_min, band_mid, band_max) AS (
  VALUES ('G1', 30000, 37500, 45000), ('G2', 45000, 57500, 70000), ('G3', 70000, 87500, 105000)
),
staff(name, grade, salary) AS (
  VALUES
    ('Anu', 'G1', 28000), ('Bala', 'G1', 39000), ('Chen', 'G1', 45000), ('Dev', 'G2', 52000), ('Ella', 'G2', 74000),
    ('Faiz', 'G2', 57500), ('Gaby', 'G3', 69000), ('Hema', 'G3', 98000), ('Ivan', 'G4', 120000)
)
SELECT s.name, s.grade, s.salary, b.band_min, b.band_max
FROM staff AS s
LEFT JOIN bands AS b ON b.grade = s.grade
ORDER BY s.name;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEFT JOIN` bands on grade, so an employee whose grade has no band stays, with `NULL` band values.
3. Test the missing band first in the `CASE`. Band edges are inside the band: at the maximum is still `'in band'`. Sort with `ORDER BY compa_ratio IS NULL, compa_ratio, name`.

## Solution

```sql
WITH bands(grade, band_min, band_mid, band_max) AS (
  VALUES ('G1', 30000, 37500, 45000), ('G2', 45000, 57500, 70000), ('G3', 70000, 87500, 105000)
),
staff(name, grade, salary) AS (
  VALUES
    ('Anu', 'G1', 28000), ('Bala', 'G1', 39000), ('Chen', 'G1', 45000), ('Dev', 'G2', 52000), ('Ella', 'G2', 74000),
    ('Faiz', 'G2', 57500), ('Gaby', 'G3', 69000), ('Hema', 'G3', 98000), ('Ivan', 'G4', 120000)
)
SELECT s.name, s.grade, s.salary, ROUND(1.0 * s.salary / b.band_mid, 2) AS compa_ratio,
  CASE WHEN b.grade IS NULL THEN 'no band'
       WHEN s.salary < b.band_min THEN 'below band'
       WHEN s.salary > b.band_max THEN 'above band'
       ELSE 'in band' END AS position
FROM staff AS s
LEFT JOIN bands AS b ON b.grade = s.grade
ORDER BY compa_ratio IS NULL, compa_ratio, s.name;
```

## Expected result

| name | grade | salary | compa_ratio | position |
| --- | --- | --- | --- | --- |
| Anu | G1 | 28000 | 0.75 | below band |
| Gaby | G3 | 69000 | 0.79 | below band |
| Dev | G2 | 52000 | 0.9 | in band |
| Faiz | G2 | 57500 | 1 | in band |
| Bala | G1 | 39000 | 1.04 | in band |
| Hema | G3 | 98000 | 1.12 | in band |
| Chen | G1 | 45000 | 1.2 | in band |
| Ella | G2 | 74000 | 1.29 | above band |
| Ivan | G4 | 120000 | NULL | no band |

## Explanation

A compa-ratio compares a salary with the midpoint of its pay band: 1.00 is exactly at the midpoint, below 1 is lower in the band. Anu (0.75) and Gaby (0.79) are paid below their band minimums, which HR usually has to fix; Ella is above her band's maximum, which often means she should be considered for the next grade.

Chen's salary equals the G1 maximum, which is still in band: band edges belong to the band. Ivan's grade G4 has no band at all, which the `LEFT JOIN` makes visible as `'no band'` instead of silently dropping him; a missing band is a gap in the pay structure that needs fixing.

**Common mistake:** joining bands with an inner join. Ivan disappears from the review, and the one salary with no band to check against is never questioned.

## Wrong answers

Feedback: missing-rows

```sql
WITH bands(grade, band_min, band_mid, band_max) AS ( VALUES ('G1', 30000, 37500, 45000), ('G2', 45000, 57500, 70000), ('G3', 70000, 87500, 105000) ), staff(name, grade, salary) AS ( VALUES ('Anu', 'G1', 28000), ('Bala', 'G1', 39000), ('Chen', 'G1', 45000), ('Dev', 'G2', 52000), ('Ella', 'G2', 74000), ('Faiz', 'G2', 57500), ('Gaby', 'G3', 69000), ('Hema', 'G3', 98000), ('Ivan', 'G4', 120000) ) SELECT s.name, s.grade, s.salary, ROUND(1.0 * s.salary / b.band_mid, 2) AS compa_ratio, CASE WHEN s.salary < b.band_min THEN 'below band' WHEN s.salary > b.band_max THEN 'above band' ELSE 'in band' END AS position FROM staff AS s JOIN bands AS b ON b.grade = s.grade ORDER BY compa_ratio, s.name;
```
