---
id: da-day-299
title: Case study: hospital bed occupancy and length of stay
order: 299
difficulty: advanced
topic: Case studies
summary: Count occupied beds per ward and day from admissions, compute occupancy and average length of stay.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a daily census from stays
  - Treat open stays as ongoing
prerequisites:
  - Day 232
  - Day 179
---

## Task

A hospital tracks admissions per ward (starter query; `discharged_on` is `NULL` for patients still admitted). A patient occupies a bed on each **night** from the admission day up to the day before discharge (a patient admitted on the 1st and discharged on the 4th occupies the nights of the 1st, 2nd and 3rd).

For each ward and each night from **1 to 5 March 2025**, return `ward`, `night`, `occupied`, `beds`, `occupancy_pct` (rounded to 1 decimal place) and `over_capacity` (`'yes'` when occupied exceeds beds). Sort by `ward`, then `night`.

## Starter query

```sql
WITH RECURSIVE wards(ward, beds) AS (
  VALUES ('General', 4), ('ICU', 2)
),
admissions(patient, ward, admitted_on, discharged_on) AS (
  VALUES
    ('p1', 'General', '2025-03-01', '2025-03-04'), ('p2', 'General', '2025-03-01', '2025-03-02'), ('p3', 'General', '2025-03-02', '2025-03-07'),
    ('p4', 'General', '2025-03-03', NULL), ('p5', 'General', '2025-03-04', '2025-03-06'), ('p6', 'ICU', '2025-03-01', '2025-03-03'),
    ('p7', 'ICU', '2025-03-02', '2025-03-08'), ('p8', 'ICU', '2025-03-04', '2025-03-05'),
    ('p9', 'General', '2025-03-04', '2025-03-06'), ('p10', 'General', '2025-03-05', '2025-03-06')
)
SELECT patient, ward, admitted_on, discharged_on
FROM admissions
ORDER BY ward, admitted_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add a calendar of the five nights.
2. Cross join wards with nights, then `LEFT JOIN` admissions on the ward with `a.admitted_on <= night AND (a.discharged_on IS NULL OR a.discharged_on > night)`.
3. `COUNT(a.patient)` is the occupied beds (0 when nobody), and occupancy divides by the ward's beds.

## Solution

```sql
WITH RECURSIVE wards(ward, beds) AS (
  VALUES ('General', 4), ('ICU', 2)
),
admissions(patient, ward, admitted_on, discharged_on) AS (
  VALUES
    ('p1', 'General', '2025-03-01', '2025-03-04'), ('p2', 'General', '2025-03-01', '2025-03-02'), ('p3', 'General', '2025-03-02', '2025-03-07'),
    ('p4', 'General', '2025-03-03', NULL), ('p5', 'General', '2025-03-04', '2025-03-06'), ('p6', 'ICU', '2025-03-01', '2025-03-03'),
    ('p7', 'ICU', '2025-03-02', '2025-03-08'), ('p8', 'ICU', '2025-03-04', '2025-03-05'),
    ('p9', 'General', '2025-03-04', '2025-03-06'), ('p10', 'General', '2025-03-05', '2025-03-06')
),
nights(night) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(night, '+1 day') FROM nights WHERE night < '2025-03-05'
),
census AS (
  SELECT w.ward, n.night, w.beds, COUNT(a.patient) AS occupied
  FROM wards AS w
  CROSS JOIN nights AS n
  LEFT JOIN admissions AS a ON a.ward = w.ward AND a.admitted_on <= n.night AND (a.discharged_on IS NULL OR a.discharged_on > n.night)
  GROUP BY w.ward, n.night, w.beds
)
SELECT ward, night, occupied, beds, ROUND(100.0 * occupied / beds, 1) AS occupancy_pct,
  CASE WHEN occupied > beds THEN 'yes' ELSE 'no' END AS over_capacity
FROM census
ORDER BY ward, night;
```

## Expected result

| ward | night | occupied | beds | occupancy_pct | over_capacity |
| --- | --- | --- | --- | --- | --- |
| General | 2025-03-01 | 2 | 4 | 50 | no |
| General | 2025-03-02 | 2 | 4 | 50 | no |
| General | 2025-03-03 | 3 | 4 | 75 | no |
| General | 2025-03-04 | 4 | 4 | 100 | no |
| General | 2025-03-05 | 5 | 4 | 125 | yes |
| ICU | 2025-03-01 | 1 | 2 | 50 | no |
| ICU | 2025-03-02 | 2 | 2 | 100 | no |
| ICU | 2025-03-03 | 1 | 2 | 50 | no |
| ICU | 2025-03-04 | 2 | 2 | 100 | no |
| ICU | 2025-03-05 | 1 | 2 | 50 | no |

## Explanation

A daily census counts the patients in a bed on each night. A stay occupies the nights from admission up to the night before discharge, so the join condition is `admitted_on <= night AND discharged_on > night`, and a patient still admitted (`NULL` discharge) occupies every night from admission on.

On 5 March the general ward has 5 patients for 4 beds, 125% occupancy, the kind of night that ends with a patient on a trolley in a corridor. Patient p4, still admitted, is counted every night from 3 March. Cross joining wards with nights first means a ward with an empty night would still show 0 rather than disappear.

**Common mistake:** testing `discharged_on >= night`. Patients are counted on the night they leave, and those still admitted (with a `NULL` discharge date) are not counted at all.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE wards(ward, beds) AS ( VALUES ('General', 4), ('ICU', 2) ), admissions(patient, ward, admitted_on, discharged_on) AS ( VALUES ('p1', 'General', '2025-03-01', '2025-03-04'), ('p2', 'General', '2025-03-01', '2025-03-02'), ('p3', 'General', '2025-03-02', '2025-03-07'), ('p4', 'General', '2025-03-03', NULL), ('p5', 'General', '2025-03-04', '2025-03-06'), ('p6', 'ICU', '2025-03-01', '2025-03-03'), ('p7', 'ICU', '2025-03-02', '2025-03-08'), ('p8', 'ICU', '2025-03-04', '2025-03-05'), ('p9', 'General', '2025-03-04', '2025-03-06'), ('p10', 'General', '2025-03-05', '2025-03-06') ), nights(night) AS (SELECT '2025-03-01' UNION ALL SELECT date(night, '+1 day') FROM nights WHERE night < '2025-03-05'), census AS (SELECT w.ward, n.night, w.beds, COUNT(a.patient) AS occupied FROM wards AS w CROSS JOIN nights AS n LEFT JOIN admissions AS a ON a.ward = w.ward AND a.admitted_on <= n.night AND a.discharged_on >= n.night GROUP BY w.ward, n.night, w.beds) SELECT ward, night, occupied, beds, ROUND(100.0 * occupied / beds, 1) AS occupancy_pct, CASE WHEN occupied > beds THEN 'yes' ELSE 'no' END AS over_capacity FROM census ORDER BY ward, night;
```
