---
id: da-day-164
title: Rank products fairly by rating
order: 164
difficulty: advanced
topic: Product analytics
summary: Shrink small-sample averages towards the overall mean with a Bayesian average.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a Bayesian average
  - Count only non-NULL values
prerequisites:
  - Day 101
  - Day 135
---

## Task

A product with one 5-star review should not outrank one with ten reviews averaging 4.7. Rank the products in the starter query by a **Bayesian average**:

`bayesian = (C × m + sum of stars) / (C + number of ratings)`

where `C = 5` and `m` is the mean of **all** ratings across all products. Reviews without stars (`NULL`) are not ratings. Return `product`, `ratings`, `avg_stars` and `bayesian` (both rounded to 2 decimal places) and `rank` (1 = best by the unrounded Bayesian average). Sort by `rank`.

## Starter query

```sql
WITH reviews(product, stars) AS (
  VALUES
    ('Atlas lamp', 5),
    ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 4),
    ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5),
    ('Cedar chair', 4), ('Cedar chair', 4), ('Cedar chair', 5), ('Cedar chair', 3), ('Cedar chair', 4),
    ('Dune rug', 2), ('Dune rug', 3), ('Dune rug', NULL), ('Dune rug', 1),
    ('Elm shelf', 5), ('Elm shelf', 5)
)
SELECT product, COUNT(stars) AS ratings, ROUND(AVG(stars), 2) AS avg_stars
FROM reviews
GROUP BY product
ORDER BY avg_stars DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The overall mean is `(SELECT AVG(stars) FROM reviews)`, which already skips `NULL`. Per product, `COUNT(stars)` and `SUM(stars)` skip them too.
3. `(5 * m + SUM(stars)) / (5 + COUNT(stars))`, with `1.0 *` to avoid whole-number division, then `RANK() OVER (ORDER BY bayesian DESC)`.

## Solution

```sql
WITH reviews(product, stars) AS (
  VALUES
    ('Atlas lamp', 5),
    ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 4),
    ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5),
    ('Cedar chair', 4), ('Cedar chair', 4), ('Cedar chair', 5), ('Cedar chair', 3), ('Cedar chair', 4),
    ('Dune rug', 2), ('Dune rug', 3), ('Dune rug', NULL), ('Dune rug', 1),
    ('Elm shelf', 5), ('Elm shelf', 5)
),
overall AS (
  SELECT AVG(stars) AS m FROM reviews
),
per_product AS (
  SELECT r.product, COUNT(r.stars) AS ratings, AVG(r.stars) AS avg_stars,
    (5 * o.m + SUM(r.stars)) / (5 + COUNT(r.stars) * 1.0) AS bayesian
  FROM reviews AS r
  CROSS JOIN overall AS o
  GROUP BY r.product
)
SELECT product, ratings, ROUND(avg_stars, 2) AS avg_stars, ROUND(bayesian, 2) AS bayesian,
  RANK() OVER (ORDER BY bayesian DESC) AS rank
FROM per_product
ORDER BY rank;
```

## Expected result

| product | ratings | avg_stars | bayesian | rank |
| --- | --- | --- | --- | --- |
| Birch desk | 10 | 4.7 | 4.53 | 1 |
| Elm shelf | 2 | 5 | 4.42 | 2 |
| Atlas lamp | 1 | 5 | 4.33 | 3 |
| Cedar chair | 5 | 4 | 4.1 | 4 |
| Dune rug | 3 | 2 | 3.37 | 5 |

## Explanation

A Bayesian average adds `C` imaginary "typical" ratings (worth the overall mean, about 4.19 here) to every product. With many real ratings they hardly matter; with one or two they pull the score towards the middle until there is more evidence.

The Birch desk, with ten ratings averaging 4.7, now leads. The Elm shelf's two perfect ratings and the Atlas lamp's single one rank next, ahead of the Cedar chair. By raw average, the lamp and shelf would share first place on almost no evidence.

The Dune rug's text-only review has no stars: `COUNT(stars)` and `AVG(stars)` skip it, so it neither drags the average down nor counts as a rating.

**Common mistake:** `COUNT(*)`, which counts the empty review as a rating and lowers the rug's score for a review that gave no score.

## Wrong answers

Feedback: incorrect-output

```sql
WITH reviews(product, stars) AS ( VALUES ('Atlas lamp', 5), ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5), ('Cedar chair', 4), ('Cedar chair', 4), ('Cedar chair', 5), ('Cedar chair', 3), ('Cedar chair', 4), ('Dune rug', 2), ('Dune rug', 3), ('Dune rug', NULL), ('Dune rug', 1), ('Elm shelf', 5), ('Elm shelf', 5) ), overall AS (SELECT AVG(stars) AS m FROM reviews), per_product AS (SELECT r.product, COUNT(*) AS ratings, AVG(r.stars) AS avg_stars, (5 * o.m + SUM(r.stars)) / (5 + COUNT(*) * 1.0) AS bayesian FROM reviews AS r CROSS JOIN overall AS o GROUP BY r.product) SELECT product, ratings, ROUND(avg_stars, 2) AS avg_stars, ROUND(bayesian, 2) AS bayesian, RANK() OVER (ORDER BY bayesian DESC) AS rank FROM per_product ORDER BY rank;
```

Feedback: incorrect-output

```sql
WITH reviews(product, stars) AS ( VALUES ('Atlas lamp', 5), ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5), ('Birch desk', 4), ('Birch desk', 5), ('Birch desk', 5), ('Cedar chair', 4), ('Cedar chair', 4), ('Cedar chair', 5), ('Cedar chair', 3), ('Cedar chair', 4), ('Dune rug', 2), ('Dune rug', 3), ('Dune rug', NULL), ('Dune rug', 1), ('Elm shelf', 5), ('Elm shelf', 5) ) SELECT product, COUNT(stars) AS ratings, ROUND(AVG(stars), 2) AS avg_stars, ROUND(AVG(stars), 2) AS bayesian, RANK() OVER (ORDER BY AVG(stars) DESC) AS rank FROM reviews GROUP BY product ORDER BY rank;
```
