SELECT 'CREATE DATABASE books_db'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'books_db'
)
\gexec
SELECT 'CREATE DATABASE authors_db'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'authors_db'
)
\gexec
SELECT 'CREATE DATABASE categories_db'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'categories_db'
)
\gexec