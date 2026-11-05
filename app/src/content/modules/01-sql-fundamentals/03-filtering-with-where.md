---
id: filtering-with-where
title: Filtering data with WHERE
module: sql-fundamentals
order: 3
level: beginner
duration: 15
summary: Keep only the rows that match a condition, using comparisons, AND and OR.
objectives:
  - Filter rows with a WHERE condition
  - Compare text and numbers with comparison operators
  - Combine conditions with AND, OR and parentheses
  - Find missing values with IS NULL
---

`SELECT` chooses which columns you see. `WHERE` chooses which **rows** you see. It is how you ask questions such as "which books cost less than 12?" or "which customers live in Bangalore?".

## The big idea

Imagine flicking through the bookshop's books one at a time and asking the same yes-or-no question about each: *"Is this a Fantasy book?"* You keep the books where the answer is **yes** and put the others aside.

That yes-or-no question is called a **condition**. `WHERE` holds a condition, and the database:

1. Asks the condition about **every row**, one at a time.
2. Keeps the row if the answer is **true**.
3. Leaves the row out if the answer is **false**.

## Building a condition, step by step

**Step 1: pick a column** to ask about, such as `genre` or `price`.

**Step 2: pick a comparison**:

| Operator | Meaning | Example |
| --- | --- | --- |
| `=` | equal to | `genre = 'Fantasy'` |
| `<>` or `!=` | not equal to | `genre <> 'Mystery'` |
| `<` | less than | `price < 12` |
| `>` | greater than | `year > 2020` |
| `<=` | less than or equal to | `price <= 12.99` |
| `>=` | greater than or equal to | `year >= 2020` |

**Step 3: write the value** to compare with:

- **Text** goes inside **single quotes**: `'Fantasy'`.
- **Numbers** are written without quotes: `2020`, `12.99`.

**Step 4: put it after `WHERE`**, which always comes after `FROM`.

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name WHERE condition;
SELECT column1 FROM table_name WHERE condition1 AND condition2;
SELECT column1 FROM table_name WHERE condition1 OR condition2;
```

- `AND` keeps a row only if **both** conditions are true.
- `OR` keeps a row if **at least one** condition is true.

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

Only the 2 Fantasy books are left. Notice that `genre` is not in the result: you can filter on a column without showing it.

### Compare numbers

Books cheaper than 12:

```sql
SELECT title, price FROM books WHERE price < 12;
```

| title | price |
| --- | --- |
| Counting Stars | 9.99 |
| Paper Lanterns | 11.25 |

### Everything except one value

`<>` means "not equal to". Every book that is not a mystery:

```sql
SELECT title, genre FROM books WHERE genre <> 'Mystery';
```

| title | genre |
| --- | --- |
| Rivers of Glass | Fantasy |
| Counting Stars | Science |
| The Last Signal | Science fiction |
| Paper Lanterns | Fantasy |

### Both must be true: AND

Mysteries published in 2020 or later:

```sql
SELECT title, year FROM books WHERE genre = 'Mystery' AND year >= 2020;
```

| title | year |
| --- | --- |
| A Quiet Ledger | 2020 |

*The Silent Orchard* is also a mystery, but it was published in 2018, so the second condition is false and it is left out.

### Either can be true: OR

Books that are Science **or** Science fiction:

```sql
SELECT title, genre FROM books WHERE genre = 'Science' OR genre = 'Science fiction';
```

| title | genre |
| --- | --- |
| Counting Stars | Science |
| The Last Signal | Science fiction |

### Find missing values with IS NULL

Which customer has no city? A missing value is `NULL`, and you test for it with `IS NULL`:

```sql
SELECT name FROM customers WHERE city IS NULL;
```

| name |
| --- |
| Sofia Rossi |

Use `IS NOT NULL` for the opposite: rows that do have a value.

## How the query runs

For `SELECT title, price FROM books WHERE genre = 'Fantasy';`:

1. **`FROM books`** picks the table: 6 rows.
2. **`WHERE`** asks the condition about every row and keeps the rows where it is true.
3. **`SELECT`** keeps only the listed columns of the rows that are left.

Here is step 2 in detail:

| id | genre | genre = 'Fantasy' | Kept? |
| --- | --- | --- | --- |
| 1 | Mystery | false | no |
| 2 | Fantasy | true | yes |
| 3 | Science | false | no |
| 4 | Science fiction | false | no |
| 5 | Fantasy | true | yes |
| 6 | Mystery | false | no |

Because `WHERE` runs **before** `SELECT`, the condition can use any column of the table, even one you are not showing.

## Common mistakes

**Forgetting the quotes around text.** Without quotes, SQL thinks `Fantasy` is the name of a column:

```sql error
SELECT title FROM books WHERE genre = Fantasy;
```

SQLite answers with `no such column: Fantasy`. **Why it happens:** words without quotes are treated as names of columns or tables. Put text values in single quotes: `'Fantasy'`.

**Getting the capitals wrong.** In SQLite, comparing text is case-sensitive, so this query runs but returns **no rows**:

```sql
SELECT title FROM books WHERE genre = 'fantasy';
```

**Why it happens:** every genre is stored as `'Fantasy'` with a capital F, and `'fantasy'` is a different piece of text. Other databases differ (MySQL often ignores capitals), so the safe habit is to match the stored values exactly. If a query unexpectedly returns nothing, check the capitals.

**Comparing with NULL using =.** This looks right but returns **no rows**:

```sql
SELECT name FROM customers WHERE city = NULL;
```

**Why it happens:** `NULL` means "unknown", and SQL will not say that an unknown value equals anything, not even another unknown. The comparison is never true. Always write `IS NULL` or `IS NOT NULL`.

**Mixing AND and OR without parentheses.** `AND` is worked out before `OR`, just as multiplication comes before addition in maths. This query looks like it asks for cheap mysteries and cheap fantasies:

```sql
SELECT title, genre, price FROM books WHERE genre = 'Mystery' OR genre = 'Fantasy' AND price < 13;
```

| title | genre | price |
| --- | --- | --- |
| The Silent Orchard | Mystery | 12.99 |
| Paper Lanterns | Fantasy | 11.25 |
| A Quiet Ledger | Mystery | 14.75 |

*A Quiet Ledger* costs 14.75 but is still included. SQL read the condition as "a mystery at any price, **or** a fantasy under 13". Parentheses make your meaning explicit:

```sql
SELECT title, genre, price FROM books WHERE (genre = 'Mystery' OR genre = 'Fantasy') AND price < 13;
```

| title | genre | price |
| --- | --- | --- |
| The Silent Orchard | Mystery | 12.99 |
| Paper Lanterns | Fantasy | 11.25 |

> Use single quotes for text values. Double quotes are meant for the names of tables and columns. SQLite sometimes accepts double-quoted text for compatibility, but other databases do not.

## Try it yourself

Open the Practice space and try each task first, then compare with the answer below it.

**Task 1.** Show the name and city of every customer who lives in Bangalore.

```sql
SELECT name, city FROM customers WHERE city = 'Bangalore';
```

| name | city |
| --- | --- |
| Aisha Khan | Bangalore |
| Daniel Kim | Bangalore |

**Task 2.** Show the title and year of every book published before 2019.

```sql
SELECT title, year FROM books WHERE year < 2019;
```

| title | year |
| --- | --- |
| The Silent Orchard | 2018 |
| Counting Stars | 2015 |

**Task 3.** Show the title, genre and price of the Fantasy or Science books that cost less than 12. *Hint: you need parentheses.*

```sql
SELECT title, genre, price FROM books WHERE (genre = 'Fantasy' OR genre = 'Science') AND price < 12;
```

| title | genre | price |
| --- | --- | --- |
| Counting Stars | Science | 9.99 |
| Paper Lanterns | Fantasy | 11.25 |

## Key takeaways

- `WHERE` keeps only the rows where its condition is true.
- Put text in single quotes; write numbers without quotes.
- `AND` needs both conditions to be true; `OR` needs at least one.
- When you combine `AND` and `OR`, add parentheses to say exactly what you mean.
- Test for missing values with `IS NULL`, never `= NULL`.
- `WHERE` runs before `SELECT`, so you can filter on columns you do not show.
