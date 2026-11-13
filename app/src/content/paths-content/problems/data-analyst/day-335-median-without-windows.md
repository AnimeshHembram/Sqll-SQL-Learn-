---
id: da-day-335
title: Median salary per department without window functions
order: 335
difficulty: advanced
topic: Interview practice
summary: Find each department's median with a correlated count, the way older SQL had to.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a median without window functions
  - Use correlated subqueries to rank
prerequisites:
  - Day 84
  - Day 247
---

## Task

Some databases (and interviewers) do not allow window functions. Compute the **median salary of each department** (starter query) without them: a salary is a middle value when at most half of the department earns less than it and at most half earns more. With an even number of employees there are two middle values; the median is their average.

Return `dept`, `employees` and `median_salary`, sorted by `dept`. Do not use `OVER`.

## Starter query

```sql
WITH employees(name, dept, salary) AS (
  VALUES
    ('Anu', 'Data', 90000), ('Bala', 'Data', 72000), ('Chen', 'Data', 81000), ('Dev', 'Data', 60000),
    ('Ella', 'Design', 55000), ('Faiz', 'Design', 70000), ('Gaby', 'Design', 62000),
    ('Hema', 'Ops', 48000), ('Ivan', 'Ops', 48000), ('Jai', 'Ops', 52000), ('Kim', 'Ops', 50000), ('Lia', 'Ops', 47000)
)
SELECT dept, name, salary
FROM employees
ORDER BY dept, salary;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. For each employee, count colleagues in the same department earning less and earning more with correlated subqueries, plus the department size.
3. Keep rows where `less <= n / 2.0` and `more <= n / 2.0`. Average the distinct salaries that qualify per department; duplicates of the middle salary (like two people on 48,000) must count once.

## Solution

```sql
WITH employees(name, dept, salary) AS (
  VALUES
    ('Anu', 'Data', 90000), ('Bala', 'Data', 72000), ('Chen', 'Data', 81000), ('Dev', 'Data', 60000),
    ('Ella', 'Design', 55000), ('Faiz', 'Design', 70000), ('Gaby', 'Design', 62000),
    ('Hema', 'Ops', 48000), ('Ivan', 'Ops', 48000), ('Jai', 'Ops', 52000), ('Kim', 'Ops', 50000), ('Lia', 'Ops', 47000)
),
positions AS (
  SELECT e.dept, e.salary,
    (SELECT COUNT(*) FROM employees AS x WHERE x.dept = e.dept AND x.salary < e.salary) AS less,
    (SELECT COUNT(*) FROM employees AS x WHERE x.dept = e.dept AND x.salary > e.salary) AS more,
    (SELECT COUNT(*) FROM employees AS x WHERE x.dept = e.dept) AS n
  FROM employees AS e
)
SELECT dept, MAX(n) AS employees, AVG(DISTINCT salary) AS median_salary
FROM positions
WHERE less <= n / 2.0 AND more <= n / 2.0
GROUP BY dept
ORDER BY dept;
```

## Expected result

| dept | employees | median_salary |
| --- | --- | --- |
| Data | 4 | 76500 |
| Design | 3 | 62000 |
| Ops | 5 | 48000 |

## Explanation

Without window functions, a median can still be found by asking, for each value, how many values lie below and above it. A value is in the middle when at most half are smaller and at most half are larger. In Data, 72,000 and 81,000 both qualify (one below and two above, and vice versa), so the median is their average, 76,500.

Ops has two people on 48,000, the middle value of five; both rows qualify, so averaging the **distinct** qualifying salaries keeps the duplicate from distorting the answer (here it would not change it, but with two different middle values plus a duplicate it would). Correlated subqueries are slow on big tables, which is exactly why window functions were added to SQL.

**Common mistake:** using the average. Data's mean is 75,750 and Ops's 49,000; one high or low salary pulls the mean, which is why medians are used for pay.

## Wrong answers

Feedback: incorrect-output

```sql
WITH employees(name, dept, salary) AS ( VALUES ('Anu', 'Data', 90000), ('Bala', 'Data', 72000), ('Chen', 'Data', 81000), ('Dev', 'Data', 60000), ('Ella', 'Design', 55000), ('Faiz', 'Design', 70000), ('Gaby', 'Design', 62000), ('Hema', 'Ops', 48000), ('Ivan', 'Ops', 48000), ('Jai', 'Ops', 52000), ('Kim', 'Ops', 50000), ('Lia', 'Ops', 47000) ) SELECT dept, COUNT(*) AS employees, AVG(salary) AS median_salary FROM employees GROUP BY dept ORDER BY dept;
```
