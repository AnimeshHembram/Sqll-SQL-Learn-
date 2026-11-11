---
id: da-day-141
title: Find double-booked rooms
order: 141
difficulty: intermediate
topic: Data quality
summary: Detect overlapping date ranges with a self-join, counting each pair once.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Detect overlapping ranges with one condition
  - Self-join each pair once
prerequisites:
  - Day 36
  - Day 92
---

## Task

A hotel suspects double bookings (data in the starter query). A booking occupies the nights from `check_in` up to, but **not including**, `check_out`, so a guest checking in on the day another checks out is fine. Return every pair of bookings for the **same room** that overlap: `booking_a` (the smaller id), `booking_b`, `room` and `overlap_nights`. Sort by `booking_a`, then `booking_b`.

## Starter query

```sql
WITH bookings(id, room, check_in, check_out) AS (
  VALUES
    (1, 'R101', '2025-03-01', '2025-03-04'), (2, 'R101', '2025-03-04', '2025-03-06'), (3, 'R101', '2025-03-05', '2025-03-08'),
    (4, 'R102', '2025-03-01', '2025-03-10'), (5, 'R102', '2025-03-03', '2025-03-05'), (6, 'R102', '2025-03-09', '2025-03-12'),
    (7, 'R103', '2025-03-01', '2025-03-02')
)
SELECT id, room, check_in, check_out
FROM bookings
ORDER BY room, check_in;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join the bookings to themselves on the same room with `a.id < b.id`, so each pair appears once and a booking is never paired with itself.
3. Two ranges overlap when `a.check_in < b.check_out AND b.check_in < a.check_out`. The overlap is from the later check-in to the earlier check-out: `julianday(MIN(a.check_out, b.check_out)) - julianday(MAX(a.check_in, b.check_in))`.

## Solution

```sql
WITH bookings(id, room, check_in, check_out) AS (
  VALUES
    (1, 'R101', '2025-03-01', '2025-03-04'), (2, 'R101', '2025-03-04', '2025-03-06'), (3, 'R101', '2025-03-05', '2025-03-08'),
    (4, 'R102', '2025-03-01', '2025-03-10'), (5, 'R102', '2025-03-03', '2025-03-05'), (6, 'R102', '2025-03-09', '2025-03-12'),
    (7, 'R103', '2025-03-01', '2025-03-02')
)
SELECT a.id AS booking_a, b.id AS booking_b, a.room,
  CAST(julianday(MIN(a.check_out, b.check_out)) - julianday(MAX(a.check_in, b.check_in)) AS INTEGER) AS overlap_nights
FROM bookings AS a
JOIN bookings AS b ON b.room = a.room AND a.id < b.id
WHERE a.check_in < b.check_out AND b.check_in < a.check_out
ORDER BY booking_a, booking_b;
```

## Expected result

| booking_a | booking_b | room | overlap_nights |
| --- | --- | --- | --- |
| 2 | 3 | R101 | 1 |
| 4 | 5 | R102 | 2 |
| 4 | 6 | R102 | 1 |

## Explanation

Two periods overlap exactly when each starts before the other ends. That one condition covers every case: partial overlap (bookings 2 and 3), one inside the other (5 inside 4), and overlap at the end (4 and 6), without listing the cases separately.

Because the check-out day is not a night stayed, the comparison is strict: bookings 1 and 2 meet on 4 March and do not overlap. Scalar `MIN` and `MAX` with two arguments pick the earlier check-out and the later check-in for the overlap length.

**Common mistakes:** using `<=`, which reports back-to-back stays as clashes; and joining on `a.id <> b.id`, which lists every clash twice.

## Wrong answers

Feedback: extra-rows

```sql
WITH bookings(id, room, check_in, check_out) AS ( VALUES (1, 'R101', '2025-03-01', '2025-03-04'), (2, 'R101', '2025-03-04', '2025-03-06'), (3, 'R101', '2025-03-05', '2025-03-08'), (4, 'R102', '2025-03-01', '2025-03-10'), (5, 'R102', '2025-03-03', '2025-03-05'), (6, 'R102', '2025-03-09', '2025-03-12'), (7, 'R103', '2025-03-01', '2025-03-02') ) SELECT a.id AS booking_a, b.id AS booking_b, a.room, CAST(julianday(MIN(a.check_out, b.check_out)) - julianday(MAX(a.check_in, b.check_in)) AS INTEGER) AS overlap_nights FROM bookings AS a JOIN bookings AS b ON b.room = a.room AND a.id < b.id WHERE a.check_in <= b.check_out AND b.check_in <= a.check_out ORDER BY booking_a, booking_b;
```

Feedback: extra-rows

```sql
WITH bookings(id, room, check_in, check_out) AS ( VALUES (1, 'R101', '2025-03-01', '2025-03-04'), (2, 'R101', '2025-03-04', '2025-03-06'), (3, 'R101', '2025-03-05', '2025-03-08'), (4, 'R102', '2025-03-01', '2025-03-10'), (5, 'R102', '2025-03-03', '2025-03-05'), (6, 'R102', '2025-03-09', '2025-03-12'), (7, 'R103', '2025-03-01', '2025-03-02') ) SELECT a.id AS booking_a, b.id AS booking_b, a.room, CAST(julianday(MIN(a.check_out, b.check_out)) - julianday(MAX(a.check_in, b.check_in)) AS INTEGER) AS overlap_nights FROM bookings AS a JOIN bookings AS b ON b.room = a.room AND a.id <> b.id WHERE a.check_in < b.check_out AND b.check_in < a.check_out ORDER BY booking_a, booking_b;
```
