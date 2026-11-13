---
id: da-day-266
title: Case study: a restaurant's evening by table
order: 266
difficulty: advanced
topic: Case studies
summary: Measure table turns, seat occupancy and revenue per seat-hour for one dinner service.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure capacity use over time
  - Normalise revenue by capacity
prerequisites:
  - Day 179
  - Day 235
---

## Task

A restaurant's dinner service runs from **19:00 to 23:00** (240 minutes). Using its tables and the evening's visits (starter query), report for **every table**:

- `turns` (visits) and `guests`,
- `occupied_pct`: minutes with a party seated ÷ 240 × 100,
- `seat_fill_pct`: guests ÷ (seats × turns) × 100, how full the table was while occupied (`NULL` with no visits),
- `revenue` and `revenue_per_seat_hour`: revenue ÷ (seats × 4 hours).

Round percentages to 1 decimal place and money to 2. Return `table_no`, `seats`, `turns`, `guests`, `occupied_pct`, `seat_fill_pct`, `revenue` and `revenue_per_seat_hour`, sorted by `revenue_per_seat_hour` from highest.

## Starter query

```sql
WITH tables(table_no, seats) AS (
  VALUES (1, 2), (2, 2), (3, 4), (4, 4), (5, 6)
),
visits(table_no, seated_at, left_at, guests, bill) AS (
  VALUES
    (1, '19:00', '20:00', 2, 1800), (1, '20:15', '21:30', 1, 900), (1, '21:40', '22:30', 2, 1500),
    (2, '19:30', '21:00', 2, 2600),
    (3, '19:00', '20:30', 3, 3300), (3, '20:45', '22:15', 4, 4200),
    (4, '19:15', '21:15', 2, 2100),
    (5, '20:00', '22:00', 6, 7800)
)
SELECT t.table_no, t.seats, v.seated_at, v.left_at, v.guests, v.bill
FROM tables AS t
LEFT JOIN visits AS v ON v.table_no = t.table_no
ORDER BY t.table_no, v.seated_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Aggregate visits per table: `COUNT(v.table_no)`, `SUM(guests)`, `SUM(bill)` and the occupied minutes `SUM((julianday('2025-01-01 ' || left_at) - julianday('2025-01-01 ' || seated_at)) * 1440)`.
3. Start from `tables` with a `LEFT JOIN` so a table with no visits would still appear, and divide by seats only where there were visits (`NULLIF(turns, 0)`).

## Solution

```sql
WITH tables(table_no, seats) AS (
  VALUES (1, 2), (2, 2), (3, 4), (4, 4), (5, 6)
),
visits(table_no, seated_at, left_at, guests, bill) AS (
  VALUES
    (1, '19:00', '20:00', 2, 1800), (1, '20:15', '21:30', 1, 900), (1, '21:40', '22:30', 2, 1500),
    (2, '19:30', '21:00', 2, 2600),
    (3, '19:00', '20:30', 3, 3300), (3, '20:45', '22:15', 4, 4200),
    (4, '19:15', '21:15', 2, 2100),
    (5, '20:00', '22:00', 6, 7800)
),
per_table AS (
  SELECT t.table_no, t.seats, COUNT(v.table_no) AS turns, COALESCE(SUM(v.guests), 0) AS guests, COALESCE(SUM(v.bill), 0) AS revenue,
    COALESCE(SUM((julianday('2025-01-01 ' || v.left_at) - julianday('2025-01-01 ' || v.seated_at)) * 1440), 0) AS occupied_minutes
  FROM tables AS t
  LEFT JOIN visits AS v ON v.table_no = t.table_no
  GROUP BY t.table_no, t.seats
)
SELECT table_no, seats, turns, guests,
  ROUND(100.0 * occupied_minutes / 240, 1) AS occupied_pct,
  ROUND(100.0 * guests / (seats * NULLIF(turns, 0)), 1) AS seat_fill_pct,
  revenue,
  ROUND(1.0 * revenue / (seats * 4), 2) AS revenue_per_seat_hour
FROM per_table
ORDER BY revenue_per_seat_hour DESC;
```

## Expected result

| table_no | seats | turns | guests | occupied_pct | seat_fill_pct | revenue | revenue_per_seat_hour |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 5 | 77.1 | 83.3 | 4200 | 525 |
| 3 | 4 | 2 | 7 | 75 | 87.5 | 7500 | 468.75 |
| 2 | 2 | 1 | 2 | 37.5 | 100 | 2600 | 325 |
| 5 | 6 | 1 | 6 | 50 | 100 | 7800 | 325 |
| 4 | 4 | 1 | 2 | 50 | 50 | 2100 | 131.25 |

## Explanation

Restaurants measure tables in seat-hours: a 6-seat table for the whole evening is 24 seat-hours of capacity, whatever happens. Revenue per seat-hour is what lets a 2-top and a 6-top be compared: table 1 turned three times and earned 525 per seat-hour, the best in the room, while the large table 5 earned more in total (7,800) but only 325 per seat-hour.

Occupancy and seat fill tell different stories. Table 4 was occupied half the evening but by a party of two at a four-seat table, so half its seats were empty even while it was taken; table 2 had one long two-person visit. Starting from `tables` with a `LEFT JOIN` would keep a table that nobody used, with zeros.

**Common mistake:** dividing revenue by turns instead of seat-hours. That measures the average bill, which favours large tables and big groups and says nothing about how well the capacity was used.

## Wrong answers

Feedback: incorrect-output

```sql
WITH tables(table_no, seats) AS ( VALUES (1, 2), (2, 2), (3, 4), (4, 4), (5, 6) ), visits(table_no, seated_at, left_at, guests, bill) AS ( VALUES (1, '19:00', '20:00', 2, 1800), (1, '20:15', '21:30', 1, 900), (1, '21:40', '22:30', 2, 1500), (2, '19:30', '21:00', 2, 2600), (3, '19:00', '20:30', 3, 3300), (3, '20:45', '22:15', 4, 4200), (4, '19:15', '21:15', 2, 2100), (5, '20:00', '22:00', 6, 7800) ), per_table AS (SELECT t.table_no, t.seats, COUNT(v.table_no) AS turns, COALESCE(SUM(v.guests), 0) AS guests, COALESCE(SUM(v.bill), 0) AS revenue, COALESCE(SUM((julianday('2025-01-01 ' || v.left_at) - julianday('2025-01-01 ' || v.seated_at)) * 1440), 0) AS occupied_minutes FROM tables AS t LEFT JOIN visits AS v ON v.table_no = t.table_no GROUP BY t.table_no, t.seats) SELECT table_no, seats, turns, guests, ROUND(100.0 * occupied_minutes / 240, 1) AS occupied_pct, ROUND(100.0 * guests / (seats * NULLIF(turns, 0)), 1) AS seat_fill_pct, revenue, ROUND(1.0 * revenue / NULLIF(turns, 0), 2) AS revenue_per_seat_hour FROM per_table ORDER BY revenue_per_seat_hour DESC;
```
