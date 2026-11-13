---
id: da-day-339
title: A leaderboard with ties and percentile tiers
order: 339
difficulty: intermediate
topic: Interview practice
summary: Rank quiz players with shared ranks for ties and label the top 10%, top 25% and the rest.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Rank with ties
  - Label tiers from a rank
prerequisites:
  - Day 101
  - Day 82
---

## Task

Rank the quiz players (starter query) by score: tied players **share a rank**, and the next rank skips accordingly (1, 2, 2, 4, …). Label each player's tier from their rank `r` among `n` players: `'top 10%'` when `r ≤ 0.1 × n`, `'top 25%'` when `r ≤ 0.25 × n`, otherwise `'rest'`.

Return `player`, `score`, `rank` and `tier` for the **top 8 ranks only** (rank 8 or better), sorted by `rank`, then `player`.

## Starter query

```sql
WITH quiz_scores(player, score) AS (
  VALUES
    ('p01', 980), ('p02', 950), ('p03', 950), ('p04', 910), ('p05', 880), ('p06', 880), ('p07', 860), ('p08', 820),
    ('p09', 800), ('p10', 790), ('p11', 760), ('p12', 700), ('p13', 640), ('p14', 600), ('p15', 520), ('p16', 480),
    ('p17', 450), ('p18', 400), ('p19', 380), ('p20', 300)
)
SELECT player, score
FROM quiz_scores
ORDER BY score DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `RANK() OVER (ORDER BY score DESC)` gives tied players the same rank and skips the following ranks.
3. Compare the rank with `0.1 * COUNT(*) OVER ()` and `0.25 * COUNT(*) OVER ()` in a `CASE`, and filter `rank <= 8` in an outer query (window results cannot be filtered in the same `WHERE`).

## Solution

```sql
WITH quiz_scores(player, score) AS (
  VALUES
    ('p01', 980), ('p02', 950), ('p03', 950), ('p04', 910), ('p05', 880), ('p06', 880), ('p07', 860), ('p08', 820),
    ('p09', 800), ('p10', 790), ('p11', 760), ('p12', 700), ('p13', 640), ('p14', 600), ('p15', 520), ('p16', 480),
    ('p17', 450), ('p18', 400), ('p19', 380), ('p20', 300)
),
ranked AS (
  SELECT player, score, RANK() OVER (ORDER BY score DESC) AS rnk, COUNT(*) OVER () AS n FROM quiz_scores
)
SELECT player, score, rnk AS "rank",
  CASE WHEN rnk <= 0.1 * n THEN 'top 10%' WHEN rnk <= 0.25 * n THEN 'top 25%' ELSE 'rest' END AS tier
FROM ranked
WHERE rnk <= 8
ORDER BY rnk, player;
```

## Expected result

| player | score | rank | tier |
| --- | --- | --- | --- |
| p01 | 980 | 1 | top 10% |
| p02 | 950 | 2 | top 10% |
| p03 | 950 | 2 | top 10% |
| p04 | 910 | 4 | top 25% |
| p05 | 880 | 5 | top 25% |
| p06 | 880 | 5 | top 25% |
| p07 | 860 | 7 | rest |
| p08 | 820 | 8 | rest |

## Explanation

`RANK()` gives tied players the same rank and then skips: p02 and p03 share second place, so the next player is fourth. Tiers based on rank then treat ties fairly, since both players on 950 are in the top 10%.

The filter on rank has to happen outside the query that computes it, because `WHERE` runs before window functions; here the outer query keeps ranks up to 8. With 20 players, the top 10% is ranks 1 and 2 and the top 25% goes up to rank 5, so the two players tied at fifth are both in it.

**Common mistake:** `DENSE_RANK()`. Ranks no longer skip after ties, so p04 becomes third and more than eight players fit in the top 8, and the tiers no longer reflect how many players are ahead.

## Wrong answers

Feedback: incorrect-output

```sql
WITH quiz_scores(player, score) AS ( VALUES ('p01', 980), ('p02', 950), ('p03', 950), ('p04', 910), ('p05', 880), ('p06', 880), ('p07', 860), ('p08', 820), ('p09', 800), ('p10', 790), ('p11', 760), ('p12', 700), ('p13', 640), ('p14', 600), ('p15', 520), ('p16', 480), ('p17', 450), ('p18', 400), ('p19', 380), ('p20', 300) ), ranked AS (SELECT player, score, DENSE_RANK() OVER (ORDER BY score DESC) AS rnk, COUNT(*) OVER () AS n FROM quiz_scores) SELECT player, score, rnk AS "rank", CASE WHEN rnk <= 0.1 * n THEN 'top 10%' WHEN rnk <= 0.25 * n THEN 'top 25%' ELSE 'rest' END AS tier FROM ranked WHERE rnk <= 8 ORDER BY rnk, player;
```
