---
id: filtering-with-where
title: Filtering data with WHERE
module: sql-fundamentals
order: 3
level: beginner
duration: 12
summary: Keep only the rows that match a condition, using comparisons, AND and OR.
objectives:
  - Filter rows with a WHERE condition
  - Compare text and numbers with comparison operators
  - Combine conditions with AND, OR and parentheses
---

`SELECT` chooses columns. `WHERE` chooses **rows**: it holds a **condition**, and only rows where the condition is true are kept in the result.

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name WHERE condition;
```

`WHERE` always comes after `FROM`. A condition usually compares a column with a value, such as `genre = 'Fantasy'` or `price < 12`.

Text values go inside **single quotes**: `'Fantasy'`. Numbers are written without quotes: `2020`, `12.99`.

| Operator | Meaning |
| --- | --- |
| `=` | equal to |
| `<>` or `!=` | not equal to |
| `<` | less than |
| `>` | greater than |
| `<=` | less than or equal to |
| `>=` | greater than or equal to |

## Examples

### Match a text value

```sql
SELECT title, price FROM books WHERE genre = 'Fantasy';
```

Expected output:

| title | price |
| --- | --- |
| Rivers of Glass | 15.50 |
| Paper Lanterns | 11.25 |

### Compare numbers

Books cheaper than 12:

```sql
SELECT title, price FROM books WHERE price < 12;
```

| title | price |
| --- | --- |
| Counting Stars | 9.99 |
| Paper Lanterns | 11.25 |

### Combine conditions with AND

`AND` keeps a row only if **both** conditions are true:

```sql
SELECT title, year FROM books WHERE genre = 'Mystery' AND year >= 2020;
```

| title | year |
| --- | --- |
| A Quiet Ledger | 2020 |

*The Silent Orchard* is also a mystery, but it was published in 2018, so it is left out.

### Combine conditions with OR

`OR` keeps a row if **either** condition is true:

```sql
SELECT title, genre FROM books WHERE genre = 'Science' OR genre = 'Science fiction';
```

| title | genre |
| --- | --- |
| Counting Stars | Science |
| The Last Signal | Science fiction |

## How the query runs

1. `FROM books` picks the table.
2. `WHERE` tests the condition against **every row**, one at a time, and keeps the rows where it is true.
3. `SELECT` then keeps only the listed columns of the remaining rows.

For `WHERE genre = 'Fantasy'`, the database checks all 6 rows:

| id | genre | genre = 'Fantasy' | Kept? |
| --- | --- | --- | --- |
| 1 | Mystery | false | no |
| 2 | Fantasy | true | yes |
| 3 | Science | false | no |
| 4 | Science fiction | false | no |
| 5 | Fantasy | true | yes |
| 6 | Mystery | false | no |

Because `WHERE` runs before `SELECT`, you can filter on a column you do not select. In the first example, `genre` is used in the condition but is not part of the result.

## Common mistakes

**Forgetting the quotes around text.** Without quotes, SQL treats `Fantasy` as the name of a column:

```sql error
SELECT title FROM books WHERE genre = Fantasy;
```

SQLite answers with `no such column: Fantasy`. Put text values in single quotes: `'Fantasy'`.

**Getting the capitals wrong.** In SQLite, text comparisons are case-sensitive by default, so this query runs but returns no rows, because every genre is stored as `'Fantasy'` with a capital F:

```sql
SELECT title FROM books WHERE genre = 'fantasy';
```

Other databases handle this differently: MySQL, for example, often ignores case. Match the stored values exactly.

**Mixing AND and OR without parentheses.** `AND` is evaluated before `OR`, just as multiplication comes before addition. This query looks like it asks for cheap mysteries and fantasies:

```sql
SELECT title, genre, price FROM books WHERE genre = 'Mystery' OR genre = 'Fantasy' AND price < 13;
```

| title | genre | price |
| --- | --- | --- |
| The Silent Orchard | Mystery | 12.99 |
| Paper Lanterns | Fantasy | 11.25 |
| A Quiet Ledger | Mystery | 14.75 |

*A Quiet Ledger* costs 14.75 but is still included. SQL read the condition as "a mystery at any price, **or** a fantasy under 13". Parentheses make the meaning explicit:

```sql
SELECT title, genre, price FROM books WHERE (genre = 'Mystery' OR genre = 'Fantasy') AND price < 13;
```

| title | genre | price |
| --- | --- | --- |
| The Silent Orchard | Mystery | 12.99 |
| Paper Lanterns | Fantasy | 11.25 |

> Use single quotes for text values. Double quotes are meant for the names of tables and columns. SQLite sometimes accepts double-quoted text for compatibility, but other databases do not.

## Key takeaways

- `WHERE` keeps only the rows where its condition is true.
- Put text in single quotes; write numbers without quotes.
- `AND` needs both conditions to be true; `OR` needs at least one.
- When you combine `AND` and `OR`, add parentheses to say exactly what you mean.
- `WHERE` runs before `SELECT`, so you can filter on columns you do not show.
