# 📚 Book Management System — Backend

A simple RESTful backend API for a Book Management System built using Node.js and Express.js, with a PostgreSQL database schema and SQL scripts for database design and normalization.

## 🚀 Features

- RESTful API using Node.js and Express.js
- Book CRUD operations (in-memory)
- Modular Express routes
- Custom middleware (request logger and error handler)
- PostgreSQL database design
- Identity primary keys with auto-generation
- Foreign key constraints with ON DELETE RESTRICT
- Indexes on foreign key columns
- Normalized database schema up to 3NF
- SQL scripts for schema creation, sample data, and queries
- Git and GitHub based version control
- API testing using Postman

## 🛠️ Tech Stack

- Node.js
- Express.js
- PostgreSQL
- SQL
- JavaScript
- Postman
- Git & GitHub
- VS Code
- SQLTools Extension

## 📁 Project Structure

    BMS-Node/
    ├── database/
    │   ├── schema.sql
    │   ├── seed.sql
    │   └── queries.sql
    ├── middleware/
    │   ├── logger.js
    │   └── errorHandler.js
    ├── routes/
    │   └── bookRoutes.js
    ├── .gitignore
    ├── package.json
    ├── server.js
    └── README.md

## 🗄️ Database Design

The Book Management System uses a relational PostgreSQL database.

The database contains three main tables:

### Authors

Stores information about book authors.

Fields:

- author_id — Primary Key (Identity, auto-generated)
- first_name
- last_name
- author_email — Unique
- author_country
- created_at

### Categories

Stores different categories of books.

Fields:

- category_id — Primary Key (Identity, auto-generated)
- category_name — Unique
- created_at

### Books

Stores information about books.

Fields:

- book_id — Primary Key (Identity, auto-generated)
- title
- book_isbn — Unique
- published_year
- book_type — CHECK constraint (printed book / ebook)
- page_count — CHECK constraint (> 0), nullable
- file_size — DECIMAL(10, 2), CHECK constraint (> 0), nullable
- author_id — Foreign Key (ON DELETE RESTRICT)
- category_id — Foreign Key (ON DELETE RESTRICT)
- created_at

## 🔗 Database Relationships

The database follows these relationships:

    Authors 1 ─────────── N Books

    Categories 1 ──────── N Books

One author can have multiple books.

One category can contain multiple books.

The Books table contains foreign keys that connect each book with its author and category.

    books.author_id
            ↓
    authors.author_id

    books.category_id
            ↓
    categories.category_id

## 🔑 Keys

### Primary Keys

Primary keys uniquely identify each record.

- authors.author_id
- categories.category_id
- books.book_id

### Foreign Keys

Foreign keys create relationships between tables.

- books.author_id references authors.author_id (ON DELETE RESTRICT)
- books.category_id references categories.category_id (ON DELETE RESTRICT)

### Indexes

Indexes are created on foreign key columns to improve query performance.

- idx_author_id on books(author_id)
- idx_category_id on books(category_id)

## 📐 Database Normalization

The database schema is normalized up to Third Normal Form (3NF).

### First Normal Form — 1NF

Each table contains atomic values.

For example, author information is stored separately instead of storing multiple authors inside a single book record.

### Second Normal Form — 2NF

All non-key attributes depend on the complete primary key.

The tables use single-column primary keys, which avoids partial dependency problems associated with composite keys.

### Third Normal Form — 3NF

Non-key attributes do not depend on other non-key attributes.

For example, author information is stored in the Authors table instead of repeating author details in every Book record.

This reduces data redundancy and improves data consistency.

## 📜 SQL Files

The database folder contains three SQL files.

### schema.sql

Contains SQL commands used to create the database tables, identity primary keys, foreign keys, CHECK constraints, UNIQUE constraints, indexes, and relationships.

### seed.sql

Contains sample data for:

- Authors
- Categories
- Books

### queries.sql

Contains SQL queries used to test and interact with the database, including:

- SELECT
- JOIN
- INSERT
- UPDATE
- DELETE
- Verification queries

## 🐘 PostgreSQL Setup

Create the PostgreSQL database:

    CREATE DATABASE bms;

Connect to the database:

    \c bms

Run the schema script using VS Code SQLTools or PostgreSQL:

    schema.sql

Then insert sample data using:

    seed.sql

Queries and testing can be performed using:

    queries.sql

## 🔍 Example Database Query

The following query retrieves books along with their authors and categories:

    SELECT
        books.title,
        authors.first_name,
        authors.last_name,
        categories.category_name
    FROM books
    JOIN authors
        ON books.author_id = authors.author_id
    JOIN categories
        ON books.category_id = categories.category_id;

## 📊 Sample Database Data

Example authors include:

- Valmiki Rishi
- Kalidasa Rishi
- William Shakespeare
- Jane Austen
- Mark Twain

Example categories include:

- Religious
- Poetry
- Romance
- Adventure
- Comedy

Example books include:

- Ramayana
- Mahabharata
- Romeo and Juliet
- Pride and Prejudice
- Adventures of Huckleberry Finn

## 🌐 API Endpoints

### Get All Books

    GET /books

### Get Book By ID

    GET /books/:id

### Create Book

    POST /books

### Update Book

    PUT /books/:id

### Delete Book

    DELETE /books/:id

## 🧩 Middleware

The application uses custom middleware for request processing.

### logger.js

Logs every incoming request with the HTTP method and URL.

### errorHandler.js

Catches unhandled errors and returns a 500 Internal Server Error response.

## 🛣️ Modular Routing

Routes are organized into separate modules to keep the application maintainable and scalable.

Book-related routes are separated from the main server configuration.

## 📦 Package Management

The project uses npm for package management.

Install dependencies:

    npm install

Start the application:

    node server.js

## 🧪 Testing

API endpoints can be tested using Postman.

Database queries can be tested using:

- PostgreSQL psql
- VS Code SQLTools

Database verification can be performed using queries such as:

    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public';

## 💾 Git & GitHub

Git is used to maintain version history and GitHub is used as a remote backup and collaboration platform.

The database SQL scripts are committed to GitHub along with the application source code.

Example workflow:

    git status

    git add .

    git commit -m "feat: design and normalize BMS database schema"

    git push


## 🔮 Future Improvements

- Connect the Express API directly to PostgreSQL using an ORM.
- Replace in-memory data with database-backed CRUD operations.
- Add database migrations and seeders.
- Add PostgreSQL connection pooling.
- Add authentication and authorization.
- Add request body validation middleware.
- Add automated API and database tests.
- Use Docker to manage the database environment.

## 🎯 Assignment

This project includes the following database design activities:

1. Create tables for Book, Author, and Category.
2. Define relationships between the tables.
3. Normalize the schema up to 3NF.
4. Write and execute SQL queries using VS Code SQLTools.
5. Maintain GitHub-based backups using Git.
6. Commit the database SQL scripts to GitHub.

## 👨‍💻 Author

Vaibhav-SF

## 📌 Status

Assignment 11 — Database Design and Normalization

Completed:
- PostgreSQL database setup
- Authors table with identity primary key
- Categories table with UNIQUE category_name
- Books table with CHECK constraints and DECIMAL file_size
- Identity primary keys on all tables
- Foreign keys with ON DELETE RESTRICT
- Indexes on foreign key columns
- One-to-many relationships
- 3NF normalization
- Sample data
- JOIN queries
- INSERT / UPDATE / DELETE testing
- SQLTools execution
- SQL scripts for GitHub backup