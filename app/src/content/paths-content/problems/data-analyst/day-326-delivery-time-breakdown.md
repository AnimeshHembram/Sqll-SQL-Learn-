---
id: da-day-326
title: Case study: where food delivery time goes
order: 326
difficulty: advanced
topic: Case studies
summary: Split delivery time into kitchen, waiting and riding, and find which part makes each restaurant slow.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Break a duration into stages
  - Pick the largest of several columns
prerequisites:
  - Day 147
  - Day 298
---

## Task

A food delivery app splits each order's time (starter query) into three parts: **kitchen** (placed to food ready), **waiting** (ready to picked up) and **riding** (picked up to delivered). For each restaurant, return `restaurant`, `orders`, `avg_kitchen`, `avg_waiting`, `avg_riding`, `avg_total` (all average minutes, rounded to 1 decimal place), `within_30_pct` (orders delivered within 30 minutes of being placed, rounded to 1 decimal place) and `biggest_part` (the name of the part with the largest average: `'kitchen'`, `'waiting'` or `'riding'`). Sort by `avg_total` from longest.

## Starter query

```sql
WITH deliveries(order_id, restaurant, placed_at, food_ready_at, picked_up_at, delivered_at) AS (
  VALUES
    (1, 'Biryani House', '19:00', '19:20', '19:28', '19:50'), (2, 'Biryani House', '19:10', '19:35', '19:37', '20:02'),
    (3, 'Biryani House', '19:30', '19:52', '20:10', '20:31'), (4, 'Dosa Corner', '19:05', '19:15', '19:17', '19:35'),
    (5, 'Dosa Corner', '19:40', '19:52', '19:55', '20:12'), (6, 'Pizza Point', '19:15', '19:30', '19:48', '20:15'),
    (7, 'Pizza Point', '19:25', '19:42', '19:58', '20:20')
)
SELECT order_id, restaurant, placed_at, food_ready_at, picked_up_at, delivered_at
FROM deliveries
ORDER BY restaurant, placed_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Minutes between two times: `(julianday('2025-01-01 ' || b) - julianday('2025-01-01 ' || a)) * 1440`. Compute the three parts and the total per order in a CTE.
3. Average per restaurant, then pick the biggest part with `CASE WHEN k >= w AND k >= r THEN 'kitchen' WHEN w >= r THEN 'waiting' ELSE 'riding' END`.

## Solution

```sql
WITH deliveries(order_id, restaurant, placed_at, food_ready_at, picked_up_at, delivered_at) AS (
  VALUES
    (1, 'Biryani House', '19:00', '19:20', '19:28', '19:50'), (2, 'Biryani House', '19:10', '19:35', '19:37', '20:02'),
    (3, 'Biryani House', '19:30', '19:52', '20:10', '20:31'), (4, 'Dosa Corner', '19:05', '19:15', '19:17', '19:35'),
    (5, 'Dosa Corner', '19:40', '19:52', '19:55', '20:12'), (6, 'Pizza Point', '19:15', '19:30', '19:48', '20:15'),
    (7, 'Pizza Point', '19:25', '19:42', '19:58', '20:20')
),
parts AS (
  SELECT restaurant,
    (julianday('2025-01-01 ' || food_ready_at) - julianday('2025-01-01 ' || placed_at)) * 1440 AS kitchen,
    (julianday('2025-01-01 ' || picked_up_at) - julianday('2025-01-01 ' || food_ready_at)) * 1440 AS waiting,
    (julianday('2025-01-01 ' || delivered_at) - julianday('2025-01-01 ' || picked_up_at)) * 1440 AS riding,
    (julianday('2025-01-01 ' || delivered_at) - julianday('2025-01-01 ' || placed_at)) * 1440 AS total
  FROM deliveries
),
averages AS (
  SELECT restaurant, COUNT(*) AS orders, AVG(kitchen) AS k, AVG(waiting) AS w, AVG(riding) AS r, AVG(total) AS t,
    100.0 * SUM(total <= 30.001) / COUNT(*) AS within_30
  FROM parts
  GROUP BY restaurant
)
SELECT restaurant, orders, ROUND(k, 1) AS avg_kitchen, ROUND(w, 1) AS avg_waiting, ROUND(r, 1) AS avg_riding, ROUND(t, 1) AS avg_total,
  ROUND(within_30, 1) AS within_30_pct,
  CASE WHEN k >= w AND k >= r THEN 'kitchen' WHEN w >= r THEN 'waiting' ELSE 'riding' END AS biggest_part
FROM averages
ORDER BY avg_total DESC;
```

## Expected result

| restaurant | orders | avg_kitchen | avg_waiting | avg_riding | avg_total | within_30_pct | biggest_part |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pizza Point | 2 | 16 | 17 | 24.5 | 57.5 | 0 | riding |
| Biryani House | 3 | 22.3 | 9.3 | 22.7 | 54.3 | 0 | riding |
| Dosa Corner | 2 | 11 | 2.5 | 17.5 | 31 | 50 | riding |

## Explanation

Breaking a delivery into stages shows which part to fix. Riding time is the biggest part everywhere, but the restaurants differ in the rest: Biryani House's kitchen takes over 22 minutes on average, while Pizza Point's food waits 17 minutes for a rider, a dispatch problem rather than a kitchen problem.

Only Dosa Corner meets a 30-minute promise at all, half the time. The biggest-part label uses a `CASE` comparing the three averages; a tie would go to the first one listed, which is an acceptable rule as long as it is stated.

**Common mistake:** measuring the total from pick-up instead of from placing the order. The customer's wait starts when they order, so kitchen and waiting time disappear and every restaurant looks quicker than it is.

## Wrong answers

Feedback: incorrect-output

```sql
WITH deliveries(order_id, restaurant, placed_at, food_ready_at, picked_up_at, delivered_at) AS ( VALUES (1, 'Biryani House', '19:00', '19:20', '19:28', '19:50'), (2, 'Biryani House', '19:10', '19:35', '19:37', '20:02'), (3, 'Biryani House', '19:30', '19:52', '20:10', '20:31'), (4, 'Dosa Corner', '19:05', '19:15', '19:17', '19:35'), (5, 'Dosa Corner', '19:40', '19:52', '19:55', '20:12'), (6, 'Pizza Point', '19:15', '19:30', '19:48', '20:15'), (7, 'Pizza Point', '19:25', '19:42', '19:58', '20:20') ), parts AS (SELECT restaurant, (julianday('2025-01-01 ' || food_ready_at) - julianday('2025-01-01 ' || placed_at)) * 1440 AS kitchen, (julianday('2025-01-01 ' || picked_up_at) - julianday('2025-01-01 ' || food_ready_at)) * 1440 AS waiting, (julianday('2025-01-01 ' || delivered_at) - julianday('2025-01-01 ' || picked_up_at)) * 1440 AS riding, (julianday('2025-01-01 ' || delivered_at) - julianday('2025-01-01 ' || picked_up_at)) * 1440 AS total FROM deliveries), averages AS (SELECT restaurant, COUNT(*) AS orders, AVG(kitchen) AS k, AVG(waiting) AS w, AVG(riding) AS r, AVG(total) AS t, 100.0 * SUM(total <= 30.001) / COUNT(*) AS within_30 FROM parts GROUP BY restaurant) SELECT restaurant, orders, ROUND(k, 1) AS avg_kitchen, ROUND(w, 1) AS avg_waiting, ROUND(r, 1) AS avg_riding, ROUND(t, 1) AS avg_total, ROUND(within_30, 1) AS within_30_pct, CASE WHEN k >= w AND k >= r THEN 'kitchen' WHEN w >= r THEN 'waiting' ELSE 'riding' END AS biggest_part FROM averages ORDER BY avg_total DESC;
```
