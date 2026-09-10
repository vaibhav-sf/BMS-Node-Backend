const express = require("express");
const router = express.Router();
const {
     Book, Author, Category } = require("../models");

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
            book_id,
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id
        } = req.body;

        const newBook = await Book.create({
            book_id,
            title,
            book_isbn,
            published_year,
            book_type,
            page_count,
            file_size,
            author_id,
            category_id
        });

        res.status(201).json(newBook);
    } catch (error) {
        console.error("Error creating book:", error);

        res.status(400).json({
            message: "Failed to create book",
            error: error.message
        });
    }
});


// PUT update a book
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

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
        console.error("Error updating book:", error);

        res.status(400).json({
            message: "Failed to update book",
            error: error.message
        });
    }
});


// DELETE a book
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

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