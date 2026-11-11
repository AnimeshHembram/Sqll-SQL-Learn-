---
id: da-day-179
title: Case study: hotel occupancy, ADR and RevPAR
order: 179
difficulty: advanced
topic: Case studies
summary: Explode stays into nights with a recursive CTE, then compute hotel KPIs for every night.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Explode date ranges into nights with a recursive CTE
  - Compute occupancy, ADR and RevPAR
prerequisites:
  - Day 141
  - Day 127
---

## Task

A hotel (rooms per type in `room_types`, bookings in `stays`) wants its key figures for each night from **2025-03-01 to 2025-03-05**. A stay occupies the nights from `check_in` up to, but not including, `check_out`, at `rate` per night; cancelled stays are ignored. For each night return:

- `night`, `rooms_sold`,
- `occupancy_pct`: rooms sold ÷ all rooms in the hotel, as a percentage rounded to 1 decimal place,
- `adr`: average daily rate, room revenue ÷ rooms sold, rounded to 2 decimal places (`NULL` with no rooms sold),
- `revpar`: room revenue ÷ all rooms, rounded to 2 decimal places.

Sort by `night`.

## Starter query

```sql
WITH RECURSIVE room_types(room_type, rooms) AS (
  VALUES ('Deluxe', 4), ('Standard', 6)
),
stays(booking, room_type, check_in, check_out, rate, status) AS (
  VALUES
    ('B1', 'Standard', '2025-03-01', '2025-03-03', 3000, 'confirmed'),
    ('B2', 'Standard', '2025-03-01', '2025-03-02', 3200, 'confirmed'),
    ('B3', 'Deluxe', '2025-02-28', '2025-03-02', 5000, 'confirmed'),
    ('B4', 'Deluxe', '2025-03-02', '2025-03-05', 4800, 'confirmed'),
    ('B5', 'Standard', '2025-03-02', '2025-03-04', 2800, 'cancelled'),
    ('B6', 'Standard', '2025-03-04', '2025-03-06', 2900, 'confirmed')
)
SELECT booking, room_type, check_in, check_out, rate, status
FROM stays
ORDER BY check_in;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Explode stays into nights: start with `SELECT booking, check_in AS night, check_out, rate FROM stays WHERE status = 'confirmed'` and add `date(night, '+1 day')` while it is before `check_out`. Generate the five report nights the same way.
3. `LEFT JOIN` the stay-nights to the report nights, count and sum, and divide by `(SELECT SUM(rooms) FROM room_types)`. `COUNT` over the joined column gives 0 on empty nights.

## Solution

```sql
WITH RECURSIVE room_types(room_type, rooms) AS (
  VALUES ('Deluxe', 4), ('Standard', 6)
),
stays(booking, room_type, check_in, check_out, rate, status) AS (
  VALUES
    ('B1', 'Standard', '2025-03-01', '2025-03-03', 3000, 'confirmed'),
    ('B2', 'Standard', '2025-03-01', '2025-03-02', 3200, 'confirmed'),
    ('B3', 'Deluxe', '2025-02-28', '2025-03-02', 5000, 'confirmed'),
    ('B4', 'Deluxe', '2025-03-02', '2025-03-05', 4800, 'confirmed'),
    ('B5', 'Standard', '2025-03-02', '2025-03-04', 2800, 'cancelled'),
    ('B6', 'Standard', '2025-03-04', '2025-03-06', 2900, 'confirmed')
),
stay_nights(booking, night, check_out, rate) AS (
  SELECT booking, check_in, check_out, rate FROM stays WHERE status = 'confirmed'
  UNION ALL
  SELECT booking, date(night, '+1 day'), check_out, rate FROM stay_nights WHERE date(night, '+1 day') < check_out
),
report_nights(night) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(night, '+1 day') FROM report_nights WHERE night < '2025-03-05'
),
per_night AS (
  SELECT r.night, COUNT(s.booking) AS rooms_sold, COALESCE(SUM(s.rate), 0) AS revenue
  FROM report_nights AS r
  LEFT JOIN stay_nights AS s ON s.night = r.night
  GROUP BY r.night
)
SELECT night, rooms_sold,
  ROUND(100.0 * rooms_sold / (SELECT SUM(rooms) FROM room_types), 1) AS occupancy_pct,
  ROUND(1.0 * revenue / NULLIF(rooms_sold, 0), 2) AS adr,
  ROUND(1.0 * revenue / (SELECT SUM(rooms) FROM room_types), 2) AS revpar
FROM per_night
ORDER BY night;
```

## Expected result

| night | rooms_sold | occupancy_pct | adr | revpar |
| --- | --- | --- | --- | --- |
| 2025-03-01 | 3 | 30 | 3733.33 | 1120 |
| 2025-03-02 | 2 | 20 | 3900 | 780 |
| 2025-03-03 | 1 | 10 | 4800 | 480 |
| 2025-03-04 | 2 | 20 | 3850 | 770 |
| 2025-03-05 | 1 | 10 | 2900 | 290 |

## Explanation

Hotels are measured per room-night, but bookings are stored per stay, so the first step is turning each stay into one row per night it occupies. The recursive CTE adds a night until it reaches the check-out day, which is not a night stayed.

B3 checked in on 28 February: only its 1 March night falls in the report. B5 was cancelled and adds nothing. On 5 March only B6 is in house.

The three KPIs answer different questions. **Occupancy**: how full? **ADR**: at what price? **RevPAR** (= occupancy × ADR): how well did the hotel turn its rooms into money? It is the figure managers compare across nights.

`NULLIF(rooms_sold, 0)` makes ADR `NULL` rather than an error on an empty night.

**Common mistakes:** counting the check-out day as a night, and dividing by rooms sold for RevPAR, which turns it into ADR.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE room_types(room_type, rooms) AS ( VALUES ('Deluxe', 4), ('Standard', 6) ), stays(booking, room_type, check_in, check_out, rate, status) AS ( VALUES ('B1', 'Standard', '2025-03-01', '2025-03-03', 3000, 'confirmed'), ('B2', 'Standard', '2025-03-01', '2025-03-02', 3200, 'confirmed'), ('B3', 'Deluxe', '2025-02-28', '2025-03-02', 5000, 'confirmed'), ('B4', 'Deluxe', '2025-03-02', '2025-03-05', 4800, 'confirmed'), ('B5', 'Standard', '2025-03-02', '2025-03-04', 2800, 'cancelled'), ('B6', 'Standard', '2025-03-04', '2025-03-06', 2900, 'confirmed') ), stay_nights(booking, night, check_out, rate) AS (SELECT booking, check_in, check_out, rate FROM stays WHERE status = 'confirmed' UNION ALL SELECT booking, date(night, '+1 day'), check_out, rate FROM stay_nights WHERE date(night, '+1 day') <= check_out), report_nights(night) AS (SELECT '2025-03-01' UNION ALL SELECT date(night, '+1 day') FROM report_nights WHERE night < '2025-03-05'), per_night AS (SELECT r.night, COUNT(s.booking) AS rooms_sold, COALESCE(SUM(s.rate), 0) AS revenue FROM report_nights AS r LEFT JOIN stay_nights AS s ON s.night = r.night GROUP BY r.night) SELECT night, rooms_sold, ROUND(100.0 * rooms_sold / (SELECT SUM(rooms) FROM room_types), 1) AS occupancy_pct, ROUND(1.0 * revenue / NULLIF(rooms_sold, 0), 2) AS adr, ROUND(1.0 * revenue / (SELECT SUM(rooms) FROM room_types), 2) AS revpar FROM per_night ORDER BY night;
```
