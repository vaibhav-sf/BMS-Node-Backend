-- Idempotent, non-destructive provisioning of CHECK / UNIQUE constraints for
-- the `books` table. Safe to run multiple times; each constraint is only added
-- if it does not already exist. This does NOT drop or recreate any existing
-- constraint and does NOT touch existing data.
--
-- Usage:
--   psql -h <host> -p <port> -U <user> -d <books_db> -f scripts/constraints.sql

-- book_type must be one of the allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'books'::regclass AND conname = 'books_book_type_check'
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_book_type_check
      CHECK (book_type IN ('printed book', 'ebook'));
  END IF;
END $$;

-- page_count, when provided, must be greater than 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'books'::regclass AND conname = 'books_page_count_check'
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_page_count_check
      CHECK (page_count IS NULL OR page_count > 0);
  END IF;
END $$;

-- file_size, when provided, must be greater than 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'books'::regclass AND conname = 'books_file_size_check'
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_file_size_check
      CHECK (file_size IS NULL OR file_size > 0);
  END IF;
END $$;

-- published_year must be within a reasonable range (up to 2026 for this
-- assignment)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'books'::regclass AND conname = 'books_published_year_check'
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_published_year_check
      CHECK (published_year BETWEEN 1000 AND 2026);
  END IF;
END $$;

-- book_isbn must be unique (usually already present as books_book_isbn_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'books'::regclass AND contype = 'u'
      AND conkey = (
        SELECT ARRAY[attnum] FROM pg_attribute
        WHERE attrelid = 'books'::regclass AND attname = 'book_isbn'
      )
  ) THEN
    ALTER TABLE books
      ADD CONSTRAINT books_book_isbn_key UNIQUE (book_isbn);
  END IF;
END $$;
