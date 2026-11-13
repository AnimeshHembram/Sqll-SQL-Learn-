---
id: da-day-269
title: Case study: clinic no-shows and lead time
order: 269
difficulty: advanced
topic: Case studies
summary: Measure no-show rates by doctor and by booking lead time, and size safe overbooking.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Band a lead time
  - Turn a rate into a capacity decision
prerequisites:
  - Day 207
  - Day 109
---

## Task

A clinic's appointment slots for two days are in the starter query (`booked` = 1 when a patient booked, `attended` = 1 when they came). Using booked slots only, report no-shows by **booking lead time** (days from `booked_on` to `slot_date`): `'0-7 days'`, `'8-30 days'` and `'31+ days'`, and by doctor.

Return one row per doctor and lead-time band that has bookings: `doctor`, `lead_band`, `booked`, `no_shows`, `no_show_pct` (rounded to 1 decimal place) and `extra_bookings_per_10`: how many extra patients could be booked per 10 slots so that expected attendance stays at or below 10 slots, computed as `FLOOR(10 × no_show_pct / (100 − no_show_pct))` with a minimum of 3 bookings (fewer bookings, or a band where every booking was a no-show, give `NULL`). Sort by `doctor`, then lead band from shortest to longest.

## Starter query

```sql
WITH slots(slot_id, doctor, slot_date, booked, attended, booked_on) AS (
  VALUES
    (1, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-01'), (2, 'Dr Rao', '2025-03-10', 1, 0, '2025-02-10'), (3, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-08'),
    (4, 'Dr Rao', '2025-03-10', 0, 0, NULL), (5, 'Dr Rao', '2025-03-11', 1, 0, '2025-02-15'), (6, 'Dr Rao', '2025-03-11', 1, 1, '2025-03-10'),
    (7, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-05'), (8, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-09'), (9, 'Dr Sen', '2025-03-10', 1, 0, '2025-01-20'),
    (10, 'Dr Sen', '2025-03-11', 1, 1, '2025-03-02'), (11, 'Dr Sen', '2025-03-11', 1, 1, '2025-02-01'), (12, 'Dr Sen', '2025-03-11', 1, 0, '2025-02-03'),
    (13, 'Dr Sen', '2025-03-11', 1, 1, '2025-01-25')
)
SELECT slot_id, doctor, slot_date, booked, attended, booked_on
FROM slots
ORDER BY doctor, slot_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Keep `booked = 1`. Lead days: `julianday(slot_date) - julianday(booked_on)`; band it with `CASE` and keep a numeric band order for sorting.
3. Group by doctor and band: `COUNT(*)` booked, `SUM(attended = 0)` no-shows. For the overbooking figure use `CASE WHEN COUNT(*) >= 3 THEN CAST(10 * p / (100 - p) AS INTEGER) END`, where `p` is the no-show percentage (`CAST` truncates like `FLOOR` for positive numbers).

## Solution

```sql
WITH slots(slot_id, doctor, slot_date, booked, attended, booked_on) AS (
  VALUES
    (1, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-01'), (2, 'Dr Rao', '2025-03-10', 1, 0, '2025-02-10'), (3, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-08'),
    (4, 'Dr Rao', '2025-03-10', 0, 0, NULL), (5, 'Dr Rao', '2025-03-11', 1, 0, '2025-02-15'), (6, 'Dr Rao', '2025-03-11', 1, 1, '2025-03-10'),
    (7, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-05'), (8, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-09'), (9, 'Dr Sen', '2025-03-10', 1, 0, '2025-01-20'),
    (10, 'Dr Sen', '2025-03-11', 1, 1, '2025-03-02'), (11, 'Dr Sen', '2025-03-11', 1, 1, '2025-02-01'), (12, 'Dr Sen', '2025-03-11', 1, 0, '2025-02-03'),
    (13, 'Dr Sen', '2025-03-11', 1, 1, '2025-01-25')
),
booked AS (
  SELECT doctor, attended, julianday(slot_date) - julianday(booked_on) AS lead_days
  FROM slots
  WHERE booked = 1
),
banded AS (
  SELECT doctor, attended,
    CASE WHEN lead_days <= 7 THEN 1 WHEN lead_days <= 30 THEN 2 ELSE 3 END AS band
  FROM booked
),
rates AS (
  SELECT doctor, band, COUNT(*) AS booked, SUM(attended = 0) AS no_shows, 100.0 * SUM(attended = 0) / COUNT(*) AS p
  FROM banded
  GROUP BY doctor, band
)
SELECT doctor, CASE band WHEN 1 THEN '0-7 days' WHEN 2 THEN '8-30 days' ELSE '31+ days' END AS lead_band,
  booked, no_shows, ROUND(p, 1) AS no_show_pct,
  CASE WHEN booked >= 3 AND p < 100 THEN CAST(10 * p / (100 - p) AS INTEGER) END AS extra_bookings_per_10
FROM rates
ORDER BY doctor, band;
```

## Expected result

| doctor | lead_band | booked | no_shows | no_show_pct | extra_bookings_per_10 |
| --- | --- | --- | --- | --- | --- |
| Dr Rao | 0-7 days | 2 | 0 | 0 | NULL |
| Dr Rao | 8-30 days | 3 | 2 | 66.7 | 20 |
| Dr Sen | 0-7 days | 2 | 0 | 0 | NULL |
| Dr Sen | 8-30 days | 1 | 0 | 0 | NULL |
| Dr Sen | 31+ days | 4 | 2 | 50 | 10 |

## Explanation

No-show rates vary by how far ahead the appointment was booked: patients who booked within a week all came, while those who booked weeks ahead often did not. For Dr Rao, two of three patients booked 8 to 30 days ahead missed their appointment; for Dr Sen, half of those who booked more than a month ahead did.

Overbooking turns the rate into a decision. If a fraction `p` of bookings do not show, booking `10 / (1 − p)` patients for 10 slots fills them on average, so the extra bookings are `10p / (1 − p)`: 20 extra per 10 slots at a 66.7% no-show rate, 10 at 50%. The minimum of 3 bookings avoids acting on one or two patients, and these samples are still small enough that a clinic would want months of data before overbooking.

**Common mistake:** forgetting to keep only booked slots. Slot 4, which nobody booked, then counts as a no-show for Dr Rao: its missing booking date falls through to the `'31+ days'` band, creating a 100% no-show band for a patient who never existed.

## Wrong answers

Feedback: extra-rows

```sql
WITH slots(slot_id, doctor, slot_date, booked, attended, booked_on) AS ( VALUES (1, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-01'), (2, 'Dr Rao', '2025-03-10', 1, 0, '2025-02-10'), (3, 'Dr Rao', '2025-03-10', 1, 1, '2025-03-08'), (4, 'Dr Rao', '2025-03-10', 0, 0, NULL), (5, 'Dr Rao', '2025-03-11', 1, 0, '2025-02-15'), (6, 'Dr Rao', '2025-03-11', 1, 1, '2025-03-10'), (7, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-05'), (8, 'Dr Sen', '2025-03-10', 1, 1, '2025-03-09'), (9, 'Dr Sen', '2025-03-10', 1, 0, '2025-01-20'), (10, 'Dr Sen', '2025-03-11', 1, 1, '2025-03-02'), (11, 'Dr Sen', '2025-03-11', 1, 1, '2025-02-01'), (12, 'Dr Sen', '2025-03-11', 1, 0, '2025-02-03'), (13, 'Dr Sen', '2025-03-11', 1, 1, '2025-01-25') ), banded AS (SELECT doctor, attended, CASE WHEN julianday(slot_date) - julianday(booked_on) <= 7 THEN 1 WHEN julianday(slot_date) - julianday(booked_on) <= 30 THEN 2 ELSE 3 END AS band FROM slots), rates AS (SELECT doctor, band, COUNT(*) AS booked, SUM(attended = 0) AS no_shows, 100.0 * SUM(attended = 0) / COUNT(*) AS p FROM banded GROUP BY doctor, band) SELECT doctor, CASE band WHEN 1 THEN '0-7 days' WHEN 2 THEN '8-30 days' ELSE '31+ days' END AS lead_band, booked, no_shows, ROUND(p, 1) AS no_show_pct, CASE WHEN booked >= 3 AND p < 100 THEN CAST(10 * p / (100 - p) AS INTEGER) END AS extra_bookings_per_10 FROM rates ORDER BY doctor, band;
```
