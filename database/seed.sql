INSERT INTO authors (author_id, first_name, last_name, author_email, author_country)
VALUES (1, 'Valmiki', 'Rishi', 'valimiki@gmail.com', 'India'),
(2, 'Kalidasa', 'Rishi', 'kalidasa@gmail.com', 'India'),
(3, 'William', 'Shakespeare', 'williamshakespeare@gmail.com', 'United Kingdom'),
(4, 'Jane', 'Austen', 'janeausten@gmail.com', 'United Kingdom'),
(5, 'Mark', 'Twain', 'marktwain@gmail.com', 'United States');

INSERT INTO categories (category_id, category_name)
VALUES 
(1, 'Religious'),
(2, 'Religious'),
(3, 'Romance'),
(4, 'Adventure'),
(5, 'Comedy');

INSERT INTO books (book_id, title, book_isbn, published_year, book_type, page_count, file_size, author_id, category_id)
VALUES
(1, 'Ramayana', '9543975937', 283, 'printed book', 1500, NULL , 1 , 1),
(2, 'Mahabharata', '8525255252', 305, 'printed book', 2000, NULL, 2, 2),
(3, 'Romeo and Juliet', '9780141439', 1597, 'ebook', NULL, 45.00, 3, 3),
(4, 'Pride and Prejudice', '9780199518', 1813, 'printed book', 432, NULL, 4, 4),
(5, 'Adventures of Huckleberry Finn', '9780142439', 1884, 'ebook', NULL, 24.4, 5, 5);

INSERT INTO books (
    book_id,
    title,
    book_isbn,
    published_year,
    book_type,
    page_count,
    file_size,
    author_id,
    category_id
)
VALUES
    (6, 'Test Book', '9999999999', 2026, 'ebook', NULL, 10.5, 1, 1);