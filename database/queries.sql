-- ============================================
-- BMS Database Queries
-- ============================================

-- 1. Display all books
SELECT * FROM books;


-- 2. Display books with author and category
SELECT
    books.title,
    authors.first_name || ' ' || authors.last_name AS author_name,
    categories.category_name
FROM books
JOIN authors
    ON books.author_id = authors.author_id
JOIN categories
    ON books.category_id = categories.category_id;


-- 3. Update a book's category
UPDATE books
SET books.title = 'Real Test Book'
WHERE book_id = 6;


-- 4. Delete a test book
DELETE FROM books
WHERE book_id = 6;