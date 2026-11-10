---
id: da-leading-author-per-country
title: The author with most books in each country
order: 2
difficulty: intermediate
topic: Top row per group
summary: Aggregate first, then pick the top author in each country.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - authors
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Rank aggregated values within groups
---

## Task

For a "featured author" shelf per country, return the author with the **most books in stock** in each country that has stocked authors: `country`, `author` and `books`. Every country here has a clear leader. Row order does not matter.

**Steps**

1. The starter query counts books per author with their country. Put it in a CTE called `counts`.
2. Number authors within each country by book count: `ROW_NUMBER() OVER (PARTITION BY country ORDER BY books DESC)`.
3. Keep number 1 in the outer query.

## Starter query

```sql
SELECT a.country, a.name AS author, COUNT(*) AS books
FROM authors AS a
JOIN books AS b ON b.author = a.name
GROUP BY a.country, a.name;
```

## Hints

1. Aggregate first, rank second: the window can only rank the counts once they exist.
2. Wrap the ranking in a second CTE, because `WHERE` cannot use a window function.
3. `WITH counts AS (starter query), ranked AS (SELECT country, author, books, ROW_NUMBER() OVER (PARTITION BY country ORDER BY books DESC) AS rn FROM counts) SELECT country, author, books FROM ranked WHERE rn = 1`

## Solution

```sql
WITH counts AS (
  SELECT a.country, a.name AS author, COUNT(*) AS books
  FROM authors AS a
  JOIN books AS b ON b.author = a.name
  GROUP BY a.country, a.name
),
ranked AS (
  SELECT country, author, books,
    ROW_NUMBER() OVER (PARTITION BY country ORDER BY books DESC) AS rn
  FROM counts
)
SELECT country, author, books
FROM ranked
WHERE rn = 1;
```

## Expected result

| country | author | books |
| --- | --- | --- |
| Hungary | Tomas Varga | 1 |
| India | Mira Das | 2 |
| Japan | Ken Ito | 1 |
| Spain | Ana Ruiz | 1 |

## Explanation

India has two authors, and Mira Das leads with two books. The other countries have a single stocked author each, who leads by default. Germany is absent because Leo Brandt has no books, so the inner join leaves no row for him.

## Wrong answers

Feedback: extra-rows

```sql
SELECT a.country, a.name AS author, COUNT(*) AS books FROM authors AS a JOIN books AS b ON b.author = a.name GROUP BY a.country, a.name;
```
