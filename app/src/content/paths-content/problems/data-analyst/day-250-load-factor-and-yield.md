---
id: da-day-250
title: Load factor and revenue per seat by flight
order: 250
difficulty: intermediate
topic: Pricing
summary: Combine seats sold across fare classes into load factor, average fare and revenue per available seat.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute capacity and yield metrics
  - Weight averages by volume
prerequisites:
  - Day 179
  - Day 235
---

## Task

For each flight (starter query), combine its fare classes and report:

- `tickets` and `load_factor_pct` (tickets ÷ seats × 100),
- `avg_fare` (revenue ÷ tickets) and `rasm` (revenue per available seat: revenue ÷ seats),
- `premium_share_pct`: share of revenue from `flex` and `business` tickets.

Round percentages to 1 decimal place and money to 2. Return `flight`, `seats`, `tickets`, `load_factor_pct`, `avg_fare`, `rasm` and `premium_share_pct`, sorted by `rasm` from highest.

## Starter query

```sql
WITH flights(flight, seats) AS (
  VALUES ('AI101', 180), ('AI202', 150), ('AI303', 120)
),
bookings(flight, fare_class, tickets, fare) AS (
  VALUES
    ('AI101', 'saver', 90, 3500), ('AI101', 'flex', 60, 5200), ('AI101', 'business', 12, 14000),
    ('AI202', 'saver', 120, 3200), ('AI202', 'flex', 20, 5000),
    ('AI303', 'saver', 40, 3800), ('AI303', 'flex', 25, 6100), ('AI303', 'business', 8, 15500)
)
SELECT f.flight, f.seats, b.fare_class, b.tickets, b.fare
FROM flights AS f
JOIN bookings AS b ON b.flight = f.flight
ORDER BY f.flight, b.fare_class;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Aggregate bookings per flight: `SUM(tickets)` and `SUM(tickets * fare)` for revenue, plus `SUM(CASE WHEN fare_class <> 'saver' THEN tickets * fare ELSE 0 END)` for premium revenue.
3. Join the flight's seats and divide: `100.0 * tickets / seats`, `1.0 * revenue / tickets`, `1.0 * revenue / seats`.

## Solution

```sql
WITH flights(flight, seats) AS (
  VALUES ('AI101', 180), ('AI202', 150), ('AI303', 120)
),
bookings(flight, fare_class, tickets, fare) AS (
  VALUES
    ('AI101', 'saver', 90, 3500), ('AI101', 'flex', 60, 5200), ('AI101', 'business', 12, 14000),
    ('AI202', 'saver', 120, 3200), ('AI202', 'flex', 20, 5000),
    ('AI303', 'saver', 40, 3800), ('AI303', 'flex', 25, 6100), ('AI303', 'business', 8, 15500)
),
per_flight AS (
  SELECT flight, SUM(tickets) AS tickets, SUM(tickets * fare) AS revenue,
    SUM(CASE WHEN fare_class <> 'saver' THEN tickets * fare ELSE 0 END) AS premium_revenue
  FROM bookings
  GROUP BY flight
)
SELECT f.flight, f.seats, p.tickets,
  ROUND(100.0 * p.tickets / f.seats, 1) AS load_factor_pct,
  ROUND(1.0 * p.revenue / p.tickets, 2) AS avg_fare,
  ROUND(1.0 * p.revenue / f.seats, 2) AS rasm,
  ROUND(100.0 * p.premium_revenue / p.revenue, 1) AS premium_share_pct
FROM flights AS f
JOIN per_flight AS p ON p.flight = f.flight
ORDER BY rasm DESC;
```

## Expected result

| flight | seats | tickets | load_factor_pct | avg_fare | rasm | premium_share_pct |
| --- | --- | --- | --- | --- | --- | --- |
| AI101 | 180 | 162 | 90 | 4907.41 | 4416.67 | 60.4 |
| AI303 | 120 | 73 | 60.8 | 5869.86 | 3570.83 | 64.5 |
| AI202 | 150 | 140 | 93.3 | 3457.14 | 3226.67 | 20.7 |

## Explanation

Load factor tells you how full a flight was; yield and RASM tell you whether it was full of the right passengers. AI202 is the fullest flight (93.3%) but sells mostly saver fares, so it earns the least per seat (3,226.67). AI303 is only 60.8% full, yet its business and flex fares give it a higher revenue per available seat than AI202.

Both averages are weighted by tickets: average fare is revenue ÷ tickets, so the 120 saver tickets on AI202 count 120 times. A plain `AVG(fare)` over the fare classes would treat 8 business seats like 90 saver seats. RASM divides by **seats**, so empty seats count against the flight, which is what makes it comparable across aircraft of different sizes.

**Common mistake:** averaging fares per fare class with `AVG(fare)`. Small premium classes count as much as large economy classes, and every flight's average fare is overstated.

## Wrong answers

Feedback: incorrect-output

```sql
WITH flights(flight, seats) AS ( VALUES ('AI101', 180), ('AI202', 150), ('AI303', 120) ), bookings(flight, fare_class, tickets, fare) AS ( VALUES ('AI101', 'saver', 90, 3500), ('AI101', 'flex', 60, 5200), ('AI101', 'business', 12, 14000), ('AI202', 'saver', 120, 3200), ('AI202', 'flex', 20, 5000), ('AI303', 'saver', 40, 3800), ('AI303', 'flex', 25, 6100), ('AI303', 'business', 8, 15500) ), per_flight AS (SELECT flight, SUM(tickets) AS tickets, SUM(tickets * fare) AS revenue, AVG(fare) AS avg_fare, SUM(CASE WHEN fare_class <> 'saver' THEN tickets * fare ELSE 0 END) AS premium_revenue FROM bookings GROUP BY flight) SELECT f.flight, f.seats, p.tickets, ROUND(100.0 * p.tickets / f.seats, 1) AS load_factor_pct, ROUND(p.avg_fare, 2) AS avg_fare, ROUND(1.0 * p.revenue / f.seats, 2) AS rasm, ROUND(100.0 * p.premium_revenue / p.revenue, 1) AS premium_share_pct FROM flights AS f JOIN per_flight AS p ON p.flight = f.flight ORDER BY rasm DESC;
```
