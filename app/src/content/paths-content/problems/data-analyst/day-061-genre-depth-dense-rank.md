---
id: da-day-061
title: Rank genres by catalogue depth
order: 61
difficulty: intermediate
topic: Window functions
summary: Rank with DENSE_RANK so ties do not leave gaps.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Rank without gaps using DENSE_RANK
prerequisites:
  - Day 39
---

## Task

Return each `genre`, `titles` (how many books it has) and `depth_rank` using `DENSE_RANK()` (1 = most titles). Sort by `depth_rank`, then `genre`.

## Starter query

```sql
SELECT genre, COUNT(*) AS titles
FROM books
GROUP BY genre;
```

## Hints

1. Rank the aggregate, as on Day 39, but with a different ranking function.
2. `DENSE_RANK()` gives tied rows the same rank and continues with the next number, without a gap.
3. `DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS depth_rank`

## Solution

```sql
SELECT genre, COUNT(*) AS titles,
  DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS depth_rank
FROM books
GROUP BY genre
ORDER BY depth_rank, genre;
```

## Expected result

| genre | titles | depth_rank |
| --- | --- | --- |
| Fantasy | 2 | 1 |
| Mystery | 2 | 1 |
| Science | 1 | 2 |
| Science fiction | 1 | 2 |

## Explanation

Fantasy and Mystery have two titles each and share rank 1; Science and Science fiction share rank 2. With `RANK()` the second pair would be ranked 3, because two rows came before them. Use `DENSE_RANK()` when the ranks describe levels rather than positions.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT genre, COUNT(*) AS titles, RANK() OVER (ORDER BY COUNT(*) DESC) AS depth_rank FROM books GROUP BY genre ORDER BY depth_rank, genre;
```
