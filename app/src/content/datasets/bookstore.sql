-- Bookstore sample database used by the SQL fundamentals module.
-- Every example query in that module is checked against this data by
-- `npm run check:examples`. Changing a row here can change lesson results.

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
