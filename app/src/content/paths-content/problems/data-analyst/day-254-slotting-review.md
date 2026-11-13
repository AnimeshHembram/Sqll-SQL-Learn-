---
id: da-day-254
title: Put the fastest movers nearest the dispatch area
order: 254
difficulty: advanced
topic: Supply chain
summary: Rank SKUs by picks and locations by distance, and list the moves that would match them up.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Match two rankings
  - Turn an analysis into a list of actions
prerequisites:
  - Day 101
  - Day 177
---

## Task

Pickers walk less when the most-picked SKUs sit in the nearest locations. Locations are ranked from nearest to farthest by `zone` (front, then middle, then back) and then by `location` code. Rank SKUs by number of picks (most first, ties alphabetical by SKU), and match the 1st SKU to the 1st location, and so on.

Return one row per SKU whose current location differs from its target: `sku`, `picks`, `current_location`, `target_location`. Sort by `picks` from most, then `sku`. SKUs that were never picked count as 0 picks.

## Starter query

```sql
WITH locations(location, zone) AS (
  VALUES ('A-01', 'front'), ('A-02', 'front'), ('B-01', 'middle'), ('B-02', 'middle'), ('C-01', 'back'), ('C-02', 'back')
),
slotting(sku, location) AS (
  VALUES ('Tape', 'A-01'), ('Gloves', 'A-02'), ('Labels', 'B-01'), ('Boxes', 'B-02'), ('Twine', 'C-01'), ('Wrap', 'C-02')
),
picks(pick_id, sku) AS (
  VALUES
    (1, 'Boxes'), (2, 'Boxes'), (3, 'Wrap'), (4, 'Boxes'), (5, 'Tape'), (6, 'Wrap'), (7, 'Boxes'), (8, 'Labels'),
    (9, 'Wrap'), (10, 'Boxes'), (11, 'Wrap'), (12, 'Gloves'), (13, 'Boxes'), (14, 'Wrap'), (15, 'Tape')
)
SELECT s.sku, s.location, l.zone
FROM slotting AS s
JOIN locations AS l ON l.location = s.location
ORDER BY l.location;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count picks per SKU from `slotting` with a `LEFT JOIN` to `picks` (`COUNT(p.pick_id)` gives 0 for SKUs never picked), then number them: `ROW_NUMBER() OVER (ORDER BY picks DESC, sku)`.
3. Number locations with `ROW_NUMBER() OVER (ORDER BY CASE zone WHEN 'front' THEN 1 WHEN 'middle' THEN 2 ELSE 3 END, location)`, join the two numberings on the rank, and keep rows where the current location differs from the target.

## Solution

```sql
WITH locations(location, zone) AS (
  VALUES ('A-01', 'front'), ('A-02', 'front'), ('B-01', 'middle'), ('B-02', 'middle'), ('C-01', 'back'), ('C-02', 'back')
),
slotting(sku, location) AS (
  VALUES ('Tape', 'A-01'), ('Gloves', 'A-02'), ('Labels', 'B-01'), ('Boxes', 'B-02'), ('Twine', 'C-01'), ('Wrap', 'C-02')
),
picks(pick_id, sku) AS (
  VALUES
    (1, 'Boxes'), (2, 'Boxes'), (3, 'Wrap'), (4, 'Boxes'), (5, 'Tape'), (6, 'Wrap'), (7, 'Boxes'), (8, 'Labels'),
    (9, 'Wrap'), (10, 'Boxes'), (11, 'Wrap'), (12, 'Gloves'), (13, 'Boxes'), (14, 'Wrap'), (15, 'Tape')
),
sku_rank AS (
  SELECT s.sku, s.location AS current_location, COUNT(p.pick_id) AS picks,
    ROW_NUMBER() OVER (ORDER BY COUNT(p.pick_id) DESC, s.sku) AS rnk
  FROM slotting AS s
  LEFT JOIN picks AS p ON p.sku = s.sku
  GROUP BY s.sku, s.location
),
location_rank AS (
  SELECT location,
    ROW_NUMBER() OVER (ORDER BY CASE zone WHEN 'front' THEN 1 WHEN 'middle' THEN 2 ELSE 3 END, location) AS rnk
  FROM locations
)
SELECT s.sku, s.picks, s.current_location, l.location AS target_location
FROM sku_rank AS s
JOIN location_rank AS l ON l.rnk = s.rnk
WHERE s.current_location <> l.location
ORDER BY s.picks DESC, s.sku;
```

## Expected result

| sku | picks | current_location | target_location |
| --- | --- | --- | --- |
| Boxes | 6 | B-02 | A-01 |
| Wrap | 5 | C-02 | A-02 |
| Tape | 2 | A-01 | B-01 |
| Gloves | 1 | A-02 | B-02 |
| Labels | 1 | B-01 | C-01 |
| Twine | 0 | C-01 | C-02 |

## Explanation

Slotting matches two rankings: SKUs by how often they are picked, and locations by how close they are to dispatch. Boxes is picked six times out of fifteen, yet sits in the middle zone, while Tape (two picks) has the best spot; moving Boxes and Wrap to the front would save walking on 11 of 15 picks.

Locations sort by zone through a `CASE`, because alphabetical order would put `back` first and `middle` after `front`. Twine, never picked, is counted with 0 picks through the `LEFT JOIN` and ends up in the farthest slot. In a real warehouse you would weigh the cost of each move against the walking saved; the query gives the list to discuss.

**Common mistake:** ranking locations by `zone` as text. `'back'` sorts before `'front'`, so the fastest movers are sent to the farthest locations.

## Wrong answers

Feedback: incorrect-output

```sql
WITH locations(location, zone) AS ( VALUES ('A-01', 'front'), ('A-02', 'front'), ('B-01', 'middle'), ('B-02', 'middle'), ('C-01', 'back'), ('C-02', 'back') ), slotting(sku, location) AS ( VALUES ('Tape', 'A-01'), ('Gloves', 'A-02'), ('Labels', 'B-01'), ('Boxes', 'B-02'), ('Twine', 'C-01'), ('Wrap', 'C-02') ), picks(pick_id, sku) AS ( VALUES (1, 'Boxes'), (2, 'Boxes'), (3, 'Wrap'), (4, 'Boxes'), (5, 'Tape'), (6, 'Wrap'), (7, 'Boxes'), (8, 'Labels'), (9, 'Wrap'), (10, 'Boxes'), (11, 'Wrap'), (12, 'Gloves'), (13, 'Boxes'), (14, 'Wrap'), (15, 'Tape') ), sku_rank AS (SELECT s.sku, s.location AS current_location, COUNT(p.pick_id) AS picks, ROW_NUMBER() OVER (ORDER BY COUNT(p.pick_id) DESC, s.sku) AS rnk FROM slotting AS s LEFT JOIN picks AS p ON p.sku = s.sku GROUP BY s.sku, s.location), location_rank AS (SELECT location, ROW_NUMBER() OVER (ORDER BY zone, location) AS rnk FROM locations) SELECT s.sku, s.picks, s.current_location, l.location AS target_location FROM sku_rank AS s JOIN location_rank AS l ON l.rnk = s.rnk WHERE s.current_location <> l.location ORDER BY s.picks DESC, s.sku;
```
