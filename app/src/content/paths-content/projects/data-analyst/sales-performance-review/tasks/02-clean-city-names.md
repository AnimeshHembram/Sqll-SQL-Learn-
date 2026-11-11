---
id: spr-02-clean-city-names
title: Clean up city names
order: 2
difficulty: intermediate
topic: Data cleaning
summary: Standardise the messy city column (spacing, capitals and old names) and count customers per real city.
module: know-the-data
duration: 20
dataset: kalaa-home
tables:
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Standardise text with TRIM, LOWER, UPPER and SUBSTR
  - Map known aliases with CASE
prerequisites:
  - Text functions
  - CASE expressions
  - Common table expressions (WITH)
---

## Task

The marketing team wants customers per city, but the `city` column was typed by hand at checkout. The same city appears as `Chennai`, `chennai`, `CHENNAI` and `Chennai ` (with a trailing space), and two cities also appear under their old names: **Bangalore** is now **Bengaluru** and **Gurgaon** is now **Gurugram**.

Return one row per real city with:

- `city`: the cleaned name, with surrounding spaces removed, a capital first letter and the rest in lower case (`Pune`), and the two old names replaced by the new ones,
- `spellings`: how many different raw spellings were merged into it,
- `customers`: the number of customers.

Sort by `customers` from most to fewest, then by `city`.

## Starter query

```sql
SELECT city, COUNT(*) AS customers
FROM customers
GROUP BY city
ORDER BY customers DESC, city;
```

## Hints

1. Clean the name in a CTE first, keeping the raw value next to it, then group the CTE by the cleaned name.
2. `TRIM` removes the spaces and `LOWER` makes the comparison case-insensitive. A `CASE LOWER(TRIM(city)) WHEN 'bangalore' THEN 'Bengaluru' ...` handles the old names.
3. For every other city, `UPPER(SUBSTR(TRIM(city), 1, 1)) || LOWER(SUBSTR(TRIM(city), 2))` builds the capitalised name. Count the raw spellings with `COUNT(DISTINCT raw_city)`.

## Solution

```sql
WITH cleaned AS (
  SELECT city AS raw_city,
         CASE LOWER(TRIM(city))
           WHEN 'bangalore' THEN 'Bengaluru'
           WHEN 'gurgaon' THEN 'Gurugram'
           ELSE UPPER(SUBSTR(TRIM(city), 1, 1)) || LOWER(SUBSTR(TRIM(city), 2))
         END AS city
  FROM customers
)
SELECT city, COUNT(DISTINCT raw_city) AS spellings, COUNT(*) AS customers
FROM cleaned
GROUP BY city
ORDER BY customers DESC, city;
```

## Expected result

| city | spellings | customers |
| --- | --- | --- |
| Chennai | 4 | 27 |
| Hyderabad | 4 | 26 |
| Kochi | 3 | 24 |
| Lucknow | 4 | 23 |
| Bengaluru | 2 | 22 |
| Chandigarh | 3 | 22 |
| Surat | 4 | 22 |
| Delhi | 3 | 21 |
| Gurugram | 2 | 20 |
| Pune | 3 | 20 |
| Kolkata | 3 | 18 |
| Mumbai | 2 | 18 |
| Ahmedabad | 3 | 17 |
| Jaipur | 2 | 17 |
| Patna | 3 | 17 |
| Guwahati | 3 | 15 |
| Bhubaneswar | 2 | 14 |

## Explanation

The CTE keeps each raw value and computes its cleaned version once; the outer query groups by the cleaned name. `COUNT(DISTINCT raw_city)` shows how much merging happened: Chennai, Hyderabad, Lucknow and Surat each had four spellings.

**What it tells the business:** 50 raw spellings collapse into 17 real cities. Without the clean-up, Chennai (27 customers, the largest city) would be split across four rows, and Bengaluru would show 17 customers instead of 22 because 5 people typed Bangalore. The checkout form should offer a city list instead of free text.

**Common mistake:** cleaning case and spaces but forgetting the renamed cities, which leaves Bangalore and Gurgaon as separate rows next to Bengaluru and Gurugram.

## Wrong answers

Feedback: incorrect-output

```sql
WITH cleaned AS (
  SELECT city AS raw_city, UPPER(SUBSTR(TRIM(city), 1, 1)) || LOWER(SUBSTR(TRIM(city), 2)) AS city
  FROM customers
)
SELECT city, COUNT(DISTINCT raw_city) AS spellings, COUNT(*) AS customers
FROM cleaned
GROUP BY city
ORDER BY customers DESC, city;
```

Feedback: incorrect-output

```sql
WITH cleaned AS (
  SELECT city AS raw_city,
         CASE LOWER(city) WHEN 'bangalore' THEN 'Bengaluru' WHEN 'gurgaon' THEN 'Gurugram'
           ELSE UPPER(SUBSTR(city, 1, 1)) || LOWER(SUBSTR(city, 2)) END AS city
  FROM customers
)
SELECT city, COUNT(DISTINCT raw_city) AS spellings, COUNT(*) AS customers
FROM cleaned
GROUP BY city
ORDER BY customers DESC, city;
```
