---
id: da-day-327
title: Case study: hotel cancellations and overbooking
order: 327
difficulty: advanced
topic: Case studies
summary: Estimate arrivals from booking counts and cancellation rates, and flag nights at risk of walking guests.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Apply a sample rate to a population
  - Turn a forecast into a capacity risk
prerequisites:
  - Day 269
  - Day 179
---

## Task

A hotel overbooks because some guests cancel or do not show up. From a sample of each night's bookings with known outcomes (starter query), estimate each night's **show rate** (sample bookings that stayed ÷ sample bookings). Apply it to the total number booked for that night (`booked_counts`) to estimate `expected_arrivals`, and compare with the 50 rooms.

Return `night`, `rooms_available`, `booked`, `show_rate_pct` (rounded to 1 decimal place), `expected_arrivals` (rounded to 1 decimal place) and `risk`: `'walk risk'` when expected arrivals exceed rooms, `'empty rooms'` when they are under 90% of rooms, otherwise `'ok'`. Sort by `night`.

## Starter query

```sql
WITH rooms(night, rooms_available) AS (
  VALUES ('2025-03-14', 50), ('2025-03-15', 50), ('2025-03-16', 50)
),
bookings(booking_id, night, status) AS (
  VALUES
    (1, '2025-03-14', 'stayed'), (2, '2025-03-14', 'stayed'), (3, '2025-03-14', 'stayed'), (4, '2025-03-14', 'stayed'), (5, '2025-03-14', 'cancelled'),
    (6, '2025-03-14', 'stayed'), (7, '2025-03-14', 'stayed'), (8, '2025-03-14', 'stayed'), (9, '2025-03-14', 'stayed'), (10, '2025-03-14', 'stayed'),
    (11, '2025-03-15', 'stayed'), (12, '2025-03-15', 'stayed'), (13, '2025-03-15', 'stayed'), (14, '2025-03-15', 'no-show'), (15, '2025-03-15', 'stayed'),
    (16, '2025-03-15', 'stayed'), (17, '2025-03-15', 'stayed'), (18, '2025-03-15', 'stayed'), (19, '2025-03-15', 'stayed'), (20, '2025-03-15', 'stayed'),
    (21, '2025-03-16', 'stayed'), (22, '2025-03-16', 'cancelled'), (23, '2025-03-16', 'stayed'), (24, '2025-03-16', 'stayed'),
    (25, '2025-03-16', 'cancelled'), (26, '2025-03-16', 'stayed'), (27, '2025-03-16', 'stayed'), (28, '2025-03-16', 'stayed')
),
booked_counts(night, booked) AS (
  VALUES ('2025-03-14', 52), ('2025-03-15', 58), ('2025-03-16', 47)
)
SELECT night, status, COUNT(*) AS bookings
FROM bookings
GROUP BY night, status
ORDER BY night, status;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Show rate per night: `1.0 * SUM(status = 'stayed') / COUNT(*)` over the sample bookings.
3. Join rooms and booked counts on the night: expected arrivals = booked × show rate; classify with `CASE`.

## Solution

```sql
WITH rooms(night, rooms_available) AS (
  VALUES ('2025-03-14', 50), ('2025-03-15', 50), ('2025-03-16', 50)
),
bookings(booking_id, night, status) AS (
  VALUES
    (1, '2025-03-14', 'stayed'), (2, '2025-03-14', 'stayed'), (3, '2025-03-14', 'stayed'), (4, '2025-03-14', 'stayed'), (5, '2025-03-14', 'cancelled'),
    (6, '2025-03-14', 'stayed'), (7, '2025-03-14', 'stayed'), (8, '2025-03-14', 'stayed'), (9, '2025-03-14', 'stayed'), (10, '2025-03-14', 'stayed'),
    (11, '2025-03-15', 'stayed'), (12, '2025-03-15', 'stayed'), (13, '2025-03-15', 'stayed'), (14, '2025-03-15', 'no-show'), (15, '2025-03-15', 'stayed'),
    (16, '2025-03-15', 'stayed'), (17, '2025-03-15', 'stayed'), (18, '2025-03-15', 'stayed'), (19, '2025-03-15', 'stayed'), (20, '2025-03-15', 'stayed'),
    (21, '2025-03-16', 'stayed'), (22, '2025-03-16', 'cancelled'), (23, '2025-03-16', 'stayed'), (24, '2025-03-16', 'stayed'),
    (25, '2025-03-16', 'cancelled'), (26, '2025-03-16', 'stayed'), (27, '2025-03-16', 'stayed'), (28, '2025-03-16', 'stayed')
),
booked_counts(night, booked) AS (
  VALUES ('2025-03-14', 52), ('2025-03-15', 58), ('2025-03-16', 47)
),
rates AS (
  SELECT night, 1.0 * SUM(status = 'stayed') / COUNT(*) AS show_rate FROM bookings GROUP BY night
)
SELECT r.night, r.rooms_available, b.booked, ROUND(100 * s.show_rate, 1) AS show_rate_pct,
  ROUND(b.booked * s.show_rate, 1) AS expected_arrivals,
  CASE WHEN b.booked * s.show_rate > r.rooms_available THEN 'walk risk'
       WHEN b.booked * s.show_rate < 0.9 * r.rooms_available THEN 'empty rooms'
       ELSE 'ok' END AS risk
FROM rooms AS r
JOIN booked_counts AS b ON b.night = r.night
JOIN rates AS s ON s.night = r.night
ORDER BY r.night;
```

## Expected result

| night | rooms_available | booked | show_rate_pct | expected_arrivals | risk |
| --- | --- | --- | --- | --- | --- |
| 2025-03-14 | 50 | 52 | 90 | 46.8 | ok |
| 2025-03-15 | 50 | 58 | 90 | 52.2 | walk risk |
| 2025-03-16 | 50 | 47 | 75 | 35.3 | empty rooms |

## Explanation

Overbooking works when you know how many booked guests will actually come. The sample of bookings with known outcomes gives each night's show rate, which is applied to the full number booked: on 15 March, 58 bookings at a 90% show rate means about 52 arrivals for 50 rooms, so the hotel may have to "walk" two guests to another hotel.

The other nights show both sides of the risk. On the 14th, about 47 arrivals is close to full. On the 16th only 75% of sampled guests stayed, so 47 bookings means about 35 arrivals and 15 empty rooms: the hotel could have taken more bookings.

**Common mistake:** counting no-shows as arrivals. Only cancellations are taken out, so every night looks fuller than it will be and the 15th's risk is overstated.

## Wrong answers

Feedback: incorrect-output

```sql
WITH rooms(night, rooms_available) AS ( VALUES ('2025-03-14', 50), ('2025-03-15', 50), ('2025-03-16', 50) ), bookings(booking_id, night, status) AS ( VALUES (1, '2025-03-14', 'stayed'), (2, '2025-03-14', 'stayed'), (3, '2025-03-14', 'stayed'), (4, '2025-03-14', 'stayed'), (5, '2025-03-14', 'cancelled'), (6, '2025-03-14', 'stayed'), (7, '2025-03-14', 'stayed'), (8, '2025-03-14', 'stayed'), (9, '2025-03-14', 'stayed'), (10, '2025-03-14', 'stayed'), (11, '2025-03-15', 'stayed'), (12, '2025-03-15', 'stayed'), (13, '2025-03-15', 'stayed'), (14, '2025-03-15', 'no-show'), (15, '2025-03-15', 'stayed'), (16, '2025-03-15', 'stayed'), (17, '2025-03-15', 'stayed'), (18, '2025-03-15', 'stayed'), (19, '2025-03-15', 'stayed'), (20, '2025-03-15', 'stayed'), (21, '2025-03-16', 'stayed'), (22, '2025-03-16', 'cancelled'), (23, '2025-03-16', 'stayed'), (24, '2025-03-16', 'stayed'), (25, '2025-03-16', 'cancelled'), (26, '2025-03-16', 'stayed'), (27, '2025-03-16', 'stayed'), (28, '2025-03-16', 'stayed') ), booked_counts(night, booked) AS ( VALUES ('2025-03-14', 52), ('2025-03-15', 58), ('2025-03-16', 47) ), rates AS (SELECT night, 1.0 * SUM(status <> 'cancelled') / COUNT(*) AS show_rate FROM bookings GROUP BY night) SELECT r.night, r.rooms_available, b.booked, ROUND(100 * s.show_rate, 1) AS show_rate_pct, ROUND(b.booked * s.show_rate, 1) AS expected_arrivals, CASE WHEN b.booked * s.show_rate > r.rooms_available THEN 'walk risk' WHEN b.booked * s.show_rate < 0.9 * r.rooms_available THEN 'empty rooms' ELSE 'ok' END AS risk FROM rooms AS r JOIN booked_counts AS b ON b.night = r.night JOIN rates AS s ON s.night = r.night ORDER BY r.night;
```
