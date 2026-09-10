-- database: :memory:
CREATE TABLE authors(
    author_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(100) UNIQUE NOT NULL,
    author_country VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories(
    category_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books(
    book_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    book_isbn VARCHAR(20) UNIQUE NOT NULL,
    published_year INTEGER NOT NULL,
    book_type VARCHAR(20) NOT NULL CHECK (book_type IN ('printed book', 'ebook')),
    page_count INTEGER CHECK (page_count > 0),
    file_size DECIMAL(10, 2) CHECK (file_size > 0),
    author_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

CREATE INDEX idx_author_id ON books(author_id);
CREATE INDEX idx_category_id ON books(category_id);

