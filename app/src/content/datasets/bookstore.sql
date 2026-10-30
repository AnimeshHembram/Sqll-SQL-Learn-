-- Bookstore sample database used by the lessons, the practice space and the challenges.
-- Every lesson example and challenge is checked against this data by
-- `npm run check`. Changing a row here can change lesson and challenge results.

-- The books table is used on its own in the SQL fundamentals module.
CREATE TABLE books (
  id     INTEGER PRIMARY KEY,
  title  TEXT    NOT NULL,
  author TEXT    NOT NULL,
  genre  TEXT    NOT NULL,
  year   INTEGER NOT NULL,
  price  REAL    NOT NULL
);

INSERT INTO books (id, title, author, genre, year, price) VALUES
  (1, 'The Silent Orchard', 'Mira Das',    'Mystery',         2018, 12.99),
  (2, 'Rivers of Glass',    'Tomas Varga', 'Fantasy',         2021, 15.50),
  (3, 'Counting Stars',     'Priya Nair',  'Science',         2015,  9.99),
  (4, 'The Last Signal',    'Mira Das',    'Science fiction', 2023, 18.00),
  (5, 'Paper Lanterns',     'Ken Ito',     'Fantasy',         2019, 11.25),
  (6, 'A Quiet Ledger',     'Ana Ruiz',    'Mystery',         2020, 14.75);

-- Authors are matched to books by name (books.author = authors.name).
-- Leo Brandt has no books in stock; Ana Ruiz's birth year is unknown (NULL).
CREATE TABLE authors (
  name    TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  born    INTEGER
);

INSERT INTO authors (name, country, born) VALUES
  ('Mira Das',    'India',   1980),
  ('Tomas Varga', 'Hungary', 1975),
  ('Priya Nair',  'India',   1990),
  ('Ken Ito',     'Japan',   1968),
  ('Ana Ruiz',    'Spain',   NULL),
  ('Leo Brandt',  'Germany', 1985);

-- Sofia Rossi has not given a city (NULL). Meera Pillai has not ordered anything yet.
CREATE TABLE customers (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  city   TEXT,
  joined TEXT NOT NULL  -- ISO date, YYYY-MM-DD
);

INSERT INTO customers (id, name, city, joined) VALUES
  (1, 'Aisha Khan',   'Bangalore', '2024-01-15'),
  (2, 'Rahul Mehta',  'Mumbai',    '2024-03-02'),
  (3, 'Sofia Rossi',  NULL,        '2024-05-20'),
  (4, 'Daniel Kim',   'Bangalore', '2025-02-11'),
  (5, 'Meera Pillai', 'Chennai',   '2025-06-30');

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  order_date  TEXT    NOT NULL,  -- ISO date, YYYY-MM-DD
  status      TEXT    NOT NULL   -- 'delivered', 'shipped' or 'cancelled'
);

INSERT INTO orders (id, customer_id, order_date, status) VALUES
  (1, 1, '2025-01-10', 'delivered'),
  (2, 2, '2025-01-18', 'delivered'),
  (3, 1, '2025-02-05', 'shipped'),
  (4, 3, '2025-02-14', 'cancelled'),
  (5, 4, '2025-03-01', 'delivered'),
  (6, 2, '2025-03-09', 'shipped');

-- One row per book in an order. unit_price is the price paid at the time.
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  book_id    INTEGER NOT NULL REFERENCES books (id),
  quantity   INTEGER NOT NULL,
  unit_price REAL    NOT NULL,
  PRIMARY KEY (order_id, book_id)
);

INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES
  (1, 1, 1, 12.99),
  (1, 3, 2,  9.99),
  (2, 2, 1, 15.50),
  (3, 4, 1, 18.00),
  (3, 5, 1, 11.25),
  (4, 1, 1, 12.99),
  (5, 2, 2, 15.50),
  (5, 6, 1, 14.75),
  (6, 3, 1,  9.99);
