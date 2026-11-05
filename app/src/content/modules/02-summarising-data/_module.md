---
id: summarising-data
title: Summarising data
order: 2
level: beginner
summary: Turn many rows into a few useful numbers. Count rows, add up and average values, then calculate them for each group with GROUP BY and HAVING.
dataset: bookstore
---

In the first module, every query returned rows that were already in the table. This module teaches you to ask questions whose answer is **a number about many rows**: *How many books do we have? What is the average price? Which genre has the most books?*

You will learn four ideas, one per lesson, and each builds on the one before:

1. `COUNT` counts rows.
2. `SUM`, `AVG`, `MIN` and `MAX` add up, average and find the smallest and largest values.
3. `GROUP BY` splits the rows into groups and calculates those numbers for each group.
4. `HAVING` keeps only the groups you want.

The examples use the same `books` table as before, plus a few rows from the other bookstore tables (`authors`, `customers`, `orders` and `order_items`). Every result shown has been checked against a real SQLite database.

**How to use each lesson:** read the short "big idea" first, press **Run** under each example and compare the result, then do the **Try it yourself** tasks in the Practice space *before* you look at the answers. Writing a query yourself, even a wrong one, is the fastest way to learn.

You should be comfortable with `SELECT`, `FROM`, `WHERE`, `ORDER BY` and `LIMIT` from the SQL fundamentals module before you start.
