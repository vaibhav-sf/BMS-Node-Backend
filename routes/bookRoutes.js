const express = require("express");
const router = express.Router();
const sequelize = require("../config/database");
const {
     Book, Author, Category } = require("../models");

// Turn a thrown error into an HTTP response.
// Bad client input — failed model validation, duplicate values, or a foreign
// key pointing at a row that doesn't exist — is the caller's fault, so it maps
// to 400 with a readable message. Anything else is unexpected: log it and
// return a plain 500 so we never leak raw DB text to the client.
function sendWriteError(res, error, action) {
    if (
        error.name === "SequelizeValidationError" ||
        error.name === "SequelizeUniqueConstraintError"
    ) {
        return res.status(400).json({
            message: `Failed to ${action}: invalid data`,
            errors: error.errors.map((e) => e.message)
        });
    }

    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({
            message: `Failed to ${action}: referenced author or category does not exist`
        });
    }

    console.error(`Error trying to ${action}:`, error);

    return res.status(500).json({
        message: `Failed to ${action}`
    });
}

// GET all books
router.get("/", async (req, res) => {
    try {
        const books = await Book.findAll({
            include: [
                {
                    model: Author,
                    attributes: ["author_id", "first_name", "last_name"]
                },
                {
                    model: Category,
                    attributes: ["category_id", "category_name"]
                }
            ]
        });

        res.json(books);
    } catch (error) {
        console.error("Error fetching books:", error);

        res.status(500).json({
            message: "Failed to fetch books"
        });
    }
});


// GET book by ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid book id"
            });
        }

        const book = await Book.findByPk(id, {
            include: [
                {
                    model: Author,
                    attributes: ["author_id", "first_name", "last_name"]
                },
                {
                    model: Category,
                    attributes: ["category_id", "category_name"]
                }
            ]
        });

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.json(book);
    } catch (error) {
        console.error("Error fetching book:", error);

        res.status(500).json({
            message: "Failed to fetch book"
        });
    }
});


// POST create a new book
router.post("/", async (req, res) => {
    try {
        const {
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id,
            description
        } = req.body;

        const newBook = await Book.create({
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id,
            description
        });

        res.status(201).json(newBook);
    } catch (error) {
        sendWriteError(res, error, "create book");
    }
});


// POST create an author and their book together in a single transaction.
// If either insert fails, both are rolled back so we never end up with an
// author that has no book (or a book pointing at a half-created author).
router.post("/with-author", async (req, res) => {
    try {
        const result = await sequelize.transaction(async (t) => {
            const { author, book } = req.body;

            const newAuthor = await Author.create(author, { transaction: t });

            const newBook = await Book.create(
                { ...book, author_id: newAuthor.author_id },
                { transaction: t }
            );

            return { author: newAuthor, book: newBook };
        });

        res.status(201).json(result);
    } catch (error) {
        sendWriteError(res, error, "create author and book");
    }
});


// PUT update a book
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid book id"
            });
        }

        const book = await Book.findByPk(id);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        const {
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id
        } = req.body;

        await book.update({
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id
        });

        res.json(book);
    } catch (error) {
        sendWriteError(res, error, "update book");
    }
});


// DELETE a book
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid book id"
            });
        }

        const book = await Book.findByPk(id);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        await book.destroy();

        res.json({
            message: "Book deleted successfully",
            book
        });
    } catch (error) {
        console.error("Error deleting book:", error);

        res.status(500).json({
            message: "Failed to delete book"
        });
    }
});


module.exports = router;