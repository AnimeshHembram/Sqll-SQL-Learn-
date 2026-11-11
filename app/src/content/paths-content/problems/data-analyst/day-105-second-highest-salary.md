---
id: da-day-105
title: Second-highest salary in each department
order: 105
difficulty: advanced
topic: Window functions
summary: Use DENSE_RANK for "the second value", and keep departments that have none.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find the n-th distinct value with DENSE_RANK
  - Keep groups that have no match
prerequisites:
  - Day 101
  - Day 8
---

## Task

For **every department** (in the starter query), return `dept` and `second_highest`: the second-highest **different** salary in that department, or `NULL` if there is none. Two people on the same top salary do not make it the second highest. Sort by `dept`.

## Starter query

```sql
WITH departments(dept) AS (
  VALUES ('Design'), ('Engineering'), ('Legal'), ('Sales'), ('Support')
),
employees(name, dept, salary) AS (
  VALUES
    ('Ira', 'Engineering', 120), ('Jai', 'Engineering', 120), ('Kim', 'Engineering', 95), ('Lou', 'Engineering', 80),
    ('Max', 'Sales', 70), ('Ned', 'Sales', 65), ('Oli', 'Sales', 65),
    ('Pia', 'Support', 50), ('Raj', 'Support', 50),
    ('Sue', 'Legal', 90)
)
SELECT dept, name, salary
FROM employees
ORDER BY dept, salary DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)` gives tied salaries the same rank, so rank 2 is always the second different salary.
3. Start from `departments` and `LEFT JOIN` the ranked rows `ON r.dept = d.dept AND r.rnk = 2`. Several people may share rank 2, so `GROUP BY d.dept` and take `MAX(r.salary)`.

## Solution

```sql
WITH departments(dept) AS (
  VALUES ('Design'), ('Engineering'), ('Legal'), ('Sales'), ('Support')
),
employees(name, dept, salary) AS (
  VALUES
    ('Ira', 'Engineering', 120), ('Jai', 'Engineering', 120), ('Kim', 'Engineering', 95), ('Lou', 'Engineering', 80),
    ('Max', 'Sales', 70), ('Ned', 'Sales', 65), ('Oli', 'Sales', 65),
    ('Pia', 'Support', 50), ('Raj', 'Support', 50),
    ('Sue', 'Legal', 90)
),
ranked AS (
  SELECT dept, salary,
    DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT d.dept, MAX(r.salary) AS second_highest
FROM departments AS d
LEFT JOIN ranked AS r ON r.dept = d.dept AND r.rnk = 2
GROUP BY d.dept
ORDER BY d.dept;
```

## Expected result

| dept | second_highest |
| --- | --- |
| Design | NULL |
| Engineering | 95 |
| Legal | NULL |
| Sales | 65 |
| Support | NULL |

## Explanation

"The second-highest" means the second **value**, which is what `DENSE_RANK` measures. Engineering has two people on 120, so its second-highest salary is 95. Support's two people both earn 50: there is no second value, so the answer is `NULL`, as it is for Legal (one person) and Design (nobody).

The rank condition is in the `ON` clause, so departments without a rank-2 row still appear.

**Common mistakes:** `ROW_NUMBER() = 2` returns 120 for Engineering and 50 for Support; and an inner join loses the departments that should show `NULL`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH departments(dept) AS ( VALUES ('Design'), ('Engineering'), ('Legal'), ('Sales'), ('Support') ), employees(name, dept, salary) AS ( VALUES ('Ira', 'Engineering', 120), ('Jai', 'Engineering', 120), ('Kim', 'Engineering', 95), ('Lou', 'Engineering', 80), ('Max', 'Sales', 70), ('Ned', 'Sales', 65), ('Oli', 'Sales', 65), ('Pia', 'Support', 50), ('Raj', 'Support', 50), ('Sue', 'Legal', 90) ), ranked AS (SELECT dept, salary, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk FROM employees) SELECT d.dept, MAX(r.salary) AS second_highest FROM departments AS d LEFT JOIN ranked AS r ON r.dept = d.dept AND r.rnk = 2 GROUP BY d.dept ORDER BY d.dept;
```

Feedback: missing-rows

```sql
WITH departments(dept) AS ( VALUES ('Design'), ('Engineering'), ('Legal'), ('Sales'), ('Support') ), employees(name, dept, salary) AS ( VALUES ('Ira', 'Engineering', 120), ('Jai', 'Engineering', 120), ('Kim', 'Engineering', 95), ('Lou', 'Engineering', 80), ('Max', 'Sales', 70), ('Ned', 'Sales', 65), ('Oli', 'Sales', 65), ('Pia', 'Support', 50), ('Raj', 'Support', 50), ('Sue', 'Legal', 90) ), ranked AS (SELECT dept, salary, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk FROM employees) SELECT dept, MAX(salary) AS second_highest FROM ranked WHERE rnk = 2 GROUP BY dept ORDER BY dept;
```
