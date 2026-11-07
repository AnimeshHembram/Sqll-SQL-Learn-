---
id: da-books-and-countries
title: Books with their author's country
order: 2
difficulty: beginner
topic: JOIN
summary: Join books to authors, where the key is the author's name rather than an id.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - books
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Join on a column that is not called id
  - Choose columns from both tables
---

## Task

The buying team wants to see which countries the shop's books come from. Return one row per book with:

- `title`
- `country`: the country of the book's author

Row order does not matter.

**Steps**

1. In this database, `books.author` holds the author's name, and `authors.name` is the matching column.
2. Join `authors` to the starter query on those two columns.
3. Add the author's `country` to the result.

## Starter query

```sql
SELECT b.title
FROM books AS b;
```

## Hints

1. Keys do not have to be ids. Any columns whose values match can link two tables.
2. The join condition is `b.author = a.name`.
3. Write `JOIN authors AS a ON b.author = a.name` and select `a.country`.

## Solution

```sql
SELECT b.title, a.country
FROM books AS b
JOIN authors AS a ON b.author = a.name;
```

## Expected result

| title | country |
| --- | --- |
| The Silent Orchard | India |
| Rivers of Glass | Hungary |
| Counting Stars | India |
| The Last Signal | India |
| Paper Lanterns | Japan |
| A Quiet Ledger | Spain |

## Explanation

Every book's author is in the `authors` table, so all 6 books appear. Leo Brandt is an author with no books, so he does not appear: an inner join only keeps matches.
