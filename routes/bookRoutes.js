const express = require("express");
const router = express.Router();

const books = [
    {
        id: 1,
        title: "Ramayana",
        author: "Valmiki",
        year: 1500
    },
    {
        id: 2,
        title: "Mahabharata",
        author: "Vyasa",
        year: 1400
    }
];


router.get("/", (req, res) => {
    res.json(books)
});

router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    const book = books.find(book => book.id === id)
    if(!book){
        return res.status(404).json(
            {
                message: "Book not found"
            }
        )
    }
    res.json(book)
});

let nextId = 3;
router.post("/", (req, res) => {
    const {title, author, year} = req.body;
    if (!title || !author || !year){
        return res.status(400).json({
            message: "Missing required fields"
        });
    }
    if(typeof year !== "number"){
        return res.status(400).json({
            message: "Year must be a number"
        });
    }
    const newBook = {
        id: nextId++,
        title,
        author,
        year
    };
    books.push(newBook)
    res.status(201).json(newBook)
});

router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    const book = books.find(book => book.id === id);
    if(!book){
        return res.status(404).json(
            {
                message: "Book not found"
            }
        )
    }
    const {title, author, year} = req.body;
    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (year  !== undefined) book.year  = year;
    res.json(book);
});

router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    const bookIndex = books.findIndex(book => book.id === id);
    if(bookIndex === -1){
        return res.status(404).json({
            message: "Book not found"
        })
    }
    const deleteBook = books.splice(bookIndex, 1);
    res.json({
        message: "Book deleted successfully",
        book: deleteBook[0]
    });
});

module.exports = router;