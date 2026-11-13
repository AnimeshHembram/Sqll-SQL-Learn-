---
id: da-day-314
title: Logins that would need impossible travel
order: 314
difficulty: advanced
topic: Risk analytics
summary: Compare consecutive logins of each user and flag pairs that imply travelling faster than a plane.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare consecutive events with LAG
  - Turn distance and time into a speed rule
prerequisites:
  - Day 311
  - Day 41
---

## Task

A security team flags **impossible travel**: two consecutive logins of the same user from places so far apart that the user would have had to travel faster than **900 km/h**. Using the logins in the starter query, compare each login with the user's **previous** one.

Estimate the distance with the equirectangular approximation, accurate enough for this purpose: `km = √((Δlat × 111)² + (Δlon × 111 × 0.95)²)`, where `Δlat` and `Δlon` are the differences in degrees, 111 is roughly the kilometres per degree of latitude, and 0.95 is a fixed simplification for how degrees of longitude shrink away from the equator.

Return the flagged pairs: `user_id`, `from_city`, `to_city`, `km` (rounded to 0 decimal places), `hours` (rounded to 2 decimal places) and `kmh` (rounded to 0 decimal places). Sort by `kmh` from highest.

## Starter query

```sql
WITH logins(user_id, logged_in_at, city, lat, lon) AS (
  VALUES
    ('u1', '2025-03-10 08:00', 'Mumbai', 19.08, 72.88), ('u1', '2025-03-10 09:30', 'Delhi', 28.61, 77.21),
    ('u1', '2025-03-10 20:00', 'Delhi', 28.61, 77.21), ('u2', '2025-03-10 07:00', 'Bengaluru', 12.97, 77.59),
    ('u2', '2025-03-10 13:00', 'Chennai', 13.08, 80.27), ('u3', '2025-03-10 10:00', 'Kolkata', 22.57, 88.36),
    ('u3', '2025-03-10 10:40', 'Singapore', 1.35, 103.82), ('u3', '2025-03-10 10:55', 'Singapore', 1.35, 103.82)
)
SELECT user_id, logged_in_at, city, lat, lon
FROM logins
ORDER BY user_id, logged_in_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Bring the previous login onto each row with `LAG(city)`, `LAG(lat)`, `LAG(lon)` and `LAG(logged_in_at)` over `PARTITION BY user_id ORDER BY logged_in_at`.
3. Distance: `SQRT(POWER((lat - prev_lat) * 111.0, 2) + POWER((lon - prev_lon) * 111.0 * 0.95, 2))`; hours: `(julianday(t) - julianday(prev_t)) * 24`. Keep rows where `km / hours > 900`.

## Solution

```sql
WITH logins(user_id, logged_in_at, city, lat, lon) AS (
  VALUES
    ('u1', '2025-03-10 08:00', 'Mumbai', 19.08, 72.88), ('u1', '2025-03-10 09:30', 'Delhi', 28.61, 77.21),
    ('u1', '2025-03-10 20:00', 'Delhi', 28.61, 77.21), ('u2', '2025-03-10 07:00', 'Bengaluru', 12.97, 77.59),
    ('u2', '2025-03-10 13:00', 'Chennai', 13.08, 80.27), ('u3', '2025-03-10 10:00', 'Kolkata', 22.57, 88.36),
    ('u3', '2025-03-10 10:40', 'Singapore', 1.35, 103.82), ('u3', '2025-03-10 10:55', 'Singapore', 1.35, 103.82)
),
pairs AS (
  SELECT user_id, city AS to_city, lat, lon, logged_in_at,
    LAG(city) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS from_city,
    LAG(lat) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_lat,
    LAG(lon) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_lon,
    LAG(logged_in_at) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_at
  FROM logins
),
speeds AS (
  SELECT user_id, from_city, to_city,
    SQRT(POWER((lat - prev_lat) * 111.0, 2) + POWER((lon - prev_lon) * 111.0 * 0.95, 2)) AS km,
    (julianday(logged_in_at) - julianday(prev_at)) * 24 AS hours
  FROM pairs
  WHERE prev_at IS NOT NULL
)
SELECT user_id, from_city, to_city, ROUND(km) AS km, ROUND(hours, 2) AS hours, ROUND(km / hours) AS kmh
FROM speeds
WHERE km / hours > 900
ORDER BY kmh DESC;
```

## Expected result

| user_id | from_city | to_city | km | hours | kmh |
| --- | --- | --- | --- | --- | --- |
| u3 | Kolkata | Singapore | 2865 | 0.67 | 4297 |

## Explanation

Impossible travel compares each login with the same user's **previous** login. `LAG` over `PARTITION BY user_id ORDER BY logged_in_at` brings the previous city, position and time onto each row; dividing distance by hours gives the implied speed.

u3 logged in from Kolkata and, 40 minutes later, from Singapore: about 2,865 km, over 4,000 km/h, so either the account is shared or one session is an attacker (or a VPN). u1's Mumbai-to-Delhi pair implies about 770 km/h, fast but possible by plane, and is not flagged. u2's day trip to Chennai is well within driving speed. The flat-earth approximation is good to a few percent over these distances, which is plenty for a threshold of 900 km/h.

**Common mistake:** comparing every pair of logins instead of consecutive ones. u3's 10:00 Kolkata login is then also paired with their second Singapore login, so one journey raises two alerts.

## Wrong answers

Feedback: extra-rows

```sql
WITH logins(user_id, logged_in_at, city, lat, lon) AS ( VALUES ('u1', '2025-03-10 08:00', 'Mumbai', 19.08, 72.88), ('u1', '2025-03-10 09:30', 'Delhi', 28.61, 77.21), ('u1', '2025-03-10 20:00', 'Delhi', 28.61, 77.21), ('u2', '2025-03-10 07:00', 'Bengaluru', 12.97, 77.59), ('u2', '2025-03-10 13:00', 'Chennai', 13.08, 80.27), ('u3', '2025-03-10 10:00', 'Kolkata', 22.57, 88.36), ('u3', '2025-03-10 10:40', 'Singapore', 1.35, 103.82), ('u3', '2025-03-10 10:55', 'Singapore', 1.35, 103.82) ), pairs AS (SELECT a.user_id, a.city AS from_city, b.city AS to_city, a.lat AS prev_lat, a.lon AS prev_lon, b.lat, b.lon, a.logged_in_at AS prev_at, b.logged_in_at FROM logins AS a JOIN logins AS b ON b.user_id = a.user_id AND b.logged_in_at > a.logged_in_at), speeds AS (SELECT user_id, from_city, to_city, SQRT(POWER((lat - prev_lat) * 111.0, 2) + POWER((lon - prev_lon) * 111.0 * 0.95, 2)) AS km, (julianday(logged_in_at) - julianday(prev_at)) * 24 AS hours FROM pairs) SELECT user_id, from_city, to_city, ROUND(km) AS km, ROUND(hours, 2) AS hours, ROUND(km / hours) AS kmh FROM speeds WHERE km / hours > 900 ORDER BY kmh DESC;
```

Feedback: incorrect-output

```sql
WITH logins(user_id, logged_in_at, city, lat, lon) AS ( VALUES ('u1', '2025-03-10 08:00', 'Mumbai', 19.08, 72.88), ('u1', '2025-03-10 09:30', 'Delhi', 28.61, 77.21), ('u1', '2025-03-10 20:00', 'Delhi', 28.61, 77.21), ('u2', '2025-03-10 07:00', 'Bengaluru', 12.97, 77.59), ('u2', '2025-03-10 13:00', 'Chennai', 13.08, 80.27), ('u3', '2025-03-10 10:00', 'Kolkata', 22.57, 88.36), ('u3', '2025-03-10 10:40', 'Singapore', 1.35, 103.82), ('u3', '2025-03-10 10:55', 'Singapore', 1.35, 103.82) ), pairs AS (SELECT user_id, city AS to_city, lat, lon, logged_in_at, LAG(city) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS from_city, LAG(lat) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_lat, LAG(lon) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_lon, LAG(logged_in_at) OVER (PARTITION BY user_id ORDER BY logged_in_at) AS prev_at FROM logins), speeds AS (SELECT user_id, from_city, to_city, SQRT(POWER((lat - prev_lat) * 111.0, 2) + POWER((lon - prev_lon) * 111.0 * 0.95, 2)) AS km, (julianday(logged_in_at) - julianday(prev_at)) AS hours FROM pairs WHERE prev_at IS NOT NULL) SELECT user_id, from_city, to_city, ROUND(km) AS km, ROUND(hours, 2) AS hours, ROUND(km / hours) AS kmh FROM speeds WHERE km / hours > 900 ORDER BY kmh DESC;
```
