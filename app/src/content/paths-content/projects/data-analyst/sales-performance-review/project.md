---
id: sales-performance-review
title: Sales performance review
order: 1
summary: Analyse two years of orders at an online home-decor retailer to explain which products, regions and channels drove growth, and present a regional scorecard.
company: Kalaa Home
industry: Online home-decor retail, India
dataset: kalaa-home
duration: 290
milestones:
  - know-the-data | Get to know the data | Profile the orders and clean the customer data before trusting any number.
  - revenue-and-growth | Revenue and growth | Measure how much the business grew, how the year unfolded and which regions hit their targets.
  - growth-drivers | What drove growth | Find the categories, products, margins and discounts behind the headline numbers.
  - customers-and-channels | Customers and channels | Learn who is buying and where returns are coming from.
  - final-challenge | Final challenge | Bring everything together in the regional scorecard for the leadership review.
finalTask: spr-12-regional-scorecard
---

## Scenario

You have just joined **Kalaa Home** as its first data analyst. It is January 2025, and the leadership team meets in two weeks for the annual business review. The founders believe 2024 was "a good year", but the regional managers tell different stories: the South is celebrating, the North says the market has turned against them, and finance has noticed that the average basket is shrinking.

Your brief from the CEO is short: *"Tell us what really happened in 2024, and why. One page, with numbers we can trust."*

In this project you work through that analysis with SQL, from raw tables to an executive scorecard. Each task answers a real question from the team, and each answer feeds the next.

## The company

Kalaa Home sells handcrafted home décor online across India: lamps and lanterns, cushions, quilts and rugs, wall art, small furniture, and kitchen and dining pieces. It started in 2021 and sells through three channels:

- its own **website**,
- a mobile **app** launched in 2023,
- a large online **marketplace**, where it pays a commission on every sale.

Customers are grouped into four sales **regions** (North, South, East and West), each with a regional manager and quarterly revenue targets.

## The problem

Revenue went up in 2024, but nobody agrees on why, and some signals are worrying:

- the **average order value** seems to be falling,
- the **North** keeps missing its targets,
- **returns** feel higher than before, especially on the marketplace,
- marketing ran **bigger discounts** in the festive season and wants to do it again.

Decisions for 2025 depend on the answers: where to invest in stock, whether to keep discounting, and what to do about the marketplace.

## Objectives

By the end of the project you will have:

1. checked and cleaned the data, and agreed what counts as revenue,
2. measured 2024 growth, the monthly trend and target attainment by region,
3. explained growth by category, product, margin and discount depth,
4. compared new and returning customers and the three sales channels,
5. built a one-row-per-region **scorecard** and written the findings for the leadership team.

## The data

The Kalaa Home database has five tables: 343 customers, 27 products, 600 orders from 2023 and 2024, 971 order lines and 16 quarterly targets. It is synthetic data, generated with a fixed seed so every learner gets exactly the same rows. Amounts are whole Indian rupees; dates are text in `YYYY-MM-DD` form, so `substr(order_date, 1, 4)` is the year and `substr(order_date, 1, 7)` the month.

| Table | One row per | Key columns |
| --- | --- | --- |
| `customers` | customer | `customer_id`, `name`, `city`, `region`, `signup_date` |
| `products` | product | `product_id`, `name`, `category`, `unit_cost`, `list_price` |
| `orders` | order | `order_id`, `customer_id`, `order_date`, `channel`, `status` |
| `order_items` | product in an order | `order_id`, `product_id`, `quantity`, `unit_price`, `discount` |
| `targets` | region and quarter | `year`, `quarter`, `region`, `revenue_target` |

**How the tables relate.** `orders.customer_id` points to `customers`; `order_items.order_id` points to `orders` and `order_items.product_id` to `products`. An order has one or more lines. `targets` joins to the data through `region` (the customer's region) and the quarter of the order date.

**Definitions used throughout.**

- *Line revenue* is `quantity * unit_price - discount`. `unit_price` is what was charged per unit (prices rose about 5% in 2024), and `discount` is the rupee discount on the whole line.
- *Net revenue* counts **delivered** orders only. Cancelled orders never shipped and returned orders were refunded.
- *Cost* is `quantity * unit_cost` from `products`.

**Known data-quality issues**, as in most real systems: city names were typed by hand (`Chennai`, `chennai`, `Chennai ` with a trailing space, and old names such as Bangalore and Gurgaon), and a few imported orders have no `channel`.

A few sample rows from `orders`:

```sql
SELECT order_id, customer_id, order_date, channel, status
FROM orders
WHERE order_id IN (5001, 5002, 5003, 5491);
```

| order_id | customer_id | order_date | channel | status |
| --- | --- | --- | --- | --- |
| 5001 | 69 | 2023-01-01 | web | delivered |
| 5002 | 164 | 2023-01-01 | app | delivered |
| 5003 | 7 | 2023-01-02 | web | delivered |
| 5491 | 254 | 2024-10-11 | app | delivered |

And the lines of one order:

```sql
SELECT order_id, product_id, quantity, unit_price, discount,
       quantity * unit_price - discount AS line_revenue
FROM order_items
WHERE order_id = 5491;
```

| order_id | product_id | quantity | unit_price | discount | line_revenue |
| --- | --- | --- | --- | --- | --- |
| 5491 | 3 | 3 | 2499 | 750 | 6747 |
| 5491 | 15 | 1 | 999 | 100 | 899 |
| 5491 | 21 | 1 | 10999 | 1100 | 9899 |

## Business questions

1. How much did net revenue grow in 2024, and did order value go up or down? *(Task 3)*
2. How did revenue move month by month, and when does the festive season show? *(Task 4)*
3. Which regions met their quarterly targets? *(Task 5)*
4. Which categories and products produced the growth, and are they profitable? *(Tasks 6 to 8)*
5. Do deep discounts bring good customers or just returns? *(Task 9)*
6. Is growth coming from new customers or from returning ones? *(Task 10)*
7. Which sales channel causes the most returns? *(Task 11)*
8. Overall, which regions are on track and which need attention? *(Final challenge)*

Tasks 1 and 2 come first because no answer is trustworthy until you know what the data contains.

## Present your findings

An analysis is only finished when someone can act on it. When you have solved the final challenge, write a **one-page summary** for the leadership team, as you would in a real job:

1. **Headline** (one sentence): what happened in 2024.
2. **Three to five findings**, each with one number from your queries and what it means for the business.
3. **Two or three recommendations** that follow from the findings.
4. **Caveats**: what the data cannot tell you, such as a small sample, synthetic data, or causes you have not tested.

Keep it short and plain: no SQL, no jargon, every number traceable to one of your queries. Put the scorecard in as the one table. This summary, with your queries, is a portfolio piece you can show an employer.

Once the project is complete, a model summary appears below for comparison.

## Model findings

**Headline:** Kalaa Home grew net revenue 15.9% in 2024, to ₹15.43 lakh, almost entirely through lower-priced lighting and textiles bought by new customers, while furniture, the North and marketplace returns held it back.

**Findings**

- **Growth is real but narrow.** Lighting (+65.9%) and Textiles (+69.6%) added more than the whole company's net growth; Furniture fell 23.0% and Kitchen & Dining 39.6%.
- **Baskets are smaller.** Average order value fell from ₹5,916 to ₹5,285 because fewer high-value furniture orders were placed. That is not bad news: furniture has the weakest margin (42.9% against 51.6% to 54.6% for other categories).
- **The South carried the year.** It grew 66.6% and reached 134.2% of its annual target. The North shrank 16.7% and reached 69.6%; its best seller is still a coffee table.
- **Deep discounts backfire.** Orders discounted 15% or more were returned 16.2% of the time (8.7% without discount) and earned the lowest margin (43.1%).
- **The marketplace returns one order in four** (24.0%), worth ₹65,438 of returned orders in 2024, more than the website (₹41,965) or the app (₹43,912), although it brings only 21.7% of net revenue.
- **Growth depends on new buyers.** 67.4% of 2024 revenue came from customers buying for the first time.

**Recommendations**

1. Shift 2025 stock and marketing towards lighting and textiles, and review the furniture range and its pricing.
2. Cap festive discounts below 15% and test the effect with a controlled campaign.
3. Audit the marketplace listings (photos, sizes, delivery promises) before the next festive season, and track its return rate monthly.
4. Give the North a merchandising plan built on the décor lines that work in the South, and set its targets from that plan.

**Caveats:** one year of comparison and a few hundred orders per year, so single months and single regions move a lot; the East's almost empty first quarter needs checking with the team before it is used. The data shows what happened, not why: the discount finding is a strong signal, not a proven cause.

## What you accomplished

You worked through a complete sales analysis, the way analysts do it on the job:

- **Data understanding and cleaning**: profiled order statuses, agreed a revenue definition and standardised messy city names with text functions and `CASE`.
- **KPIs and trends**: built yearly KPIs with two-step aggregation, period-over-period growth with `LAG`, and a running total with a window frame.
- **Targets and drivers**: compared actuals with targets through a `LEFT JOIN`, pivoted years with conditional aggregation, ranked products within regions, and measured margin and discount effects.
- **Customers and operations**: separated new from returning customers and compared channels on revenue and returns, handling missing values with `COALESCE`.
- **Executive reporting**: combined CTEs at different grains into a one-row-per-region scorecard with a business verdict.

These are the core skills of a data analyst interview task. Keep your queries and your one-page summary together as a portfolio project.
