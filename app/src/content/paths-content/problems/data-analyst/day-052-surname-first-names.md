---
id: da-day-052
title: Names in "SURNAME, First name" format
order: 52
difficulty: intermediate
topic: Text functions
summary: Split and reformat text with instr, substr and upper.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Find a character with instr
  - Slice text with substr
  - Join text with ||
prerequisites:
  - Day 6
---

## Task

A shipping label printer wants names as `KHAN, Aisha`. Return `label` for every customer: the surname in capitals, a comma and a space, then the first name. Every name in the table is one first name and one surname separated by a space. Sort by `label`.

## Starter query

```sql
SELECT name, instr(name, ' ') AS space_at
FROM customers;
```

## Hints

1. `instr(name, ' ')` gives the position of the space. The first name is everything before it, the surname everything after.
2. `substr(text, start, length)` cuts out part of a string; leaving out the length takes the rest.
3. `upper(substr(name, instr(name, ' ') + 1)) || ', ' || substr(name, 1, instr(name, ' ') - 1) AS label`

## Solution

```sql
SELECT upper(substr(name, instr(name, ' ') + 1)) || ', ' || substr(name, 1, instr(name, ' ') - 1) AS label
FROM customers
ORDER BY label;
```

## Expected result

| label |
| --- |
| KHAN, Aisha |
| KIM, Daniel |
| MEHTA, Rahul |
| PILLAI, Meera |
| ROSSI, Sofia |

## Explanation

`||` joins pieces of text. Finding the separator with `instr` and slicing with `substr` is how most text reformatting is done in SQL. It relies on the stated rule that every name has exactly one space, which is worth checking before using it on real data.
