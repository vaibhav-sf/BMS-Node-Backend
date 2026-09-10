INSERT INTO authors (first_name, last_name, author_email, author_country)
VALUES ('Valmiki', 'Rishi', 'valimiki@gmail.com', 'India'),
('Kalidasa', 'Rishi', 'kalidasa@gmail.com', 'India'),
('William', 'Shakespeare', 'williamshakespeare@gmail.com', 'United Kingdom'),
('Jane', 'Austen', 'janeausten@gmail.com', 'United Kingdom'),
('Mark', 'Twain', 'marktwain@gmail.com', 'United States');

INSERT INTO categories (category_name)
VALUES 
('Religious'),
('Action'),
('Romance'),
('Adventure'),
('Comedy');

INSERT INTO books (title, book_isbn, published_year, book_type, page_count, file_size, author_id, category_id)
VALUES
('Ramayana', '9543975937', 283, 'printed book', 1500, NULL, 1, 1),
('Mahabharata', '8525255252', 305, 'printed book', 2000, NULL, 2, 2),
('Romeo and Juliet', '9780141439', 1597, 'ebook', NULL, 45.00, 3, 3),
('Pride and Prejudice', '9780199518', 1813, 'printed book', 432, NULL, 4, 4),
('Adventures of Huckleberry Finn', '9780142439', 1884, 'ebook', NULL, 24.4, 5, 5);

INSERT INTO books (
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
    ('Test Book', '9999999999', 2026, 'ebook', NULL, 10.5, 1, 1);