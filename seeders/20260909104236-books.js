"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("books", [
            {
                book_id: 1,
                title: "Ramayana",
                book_isbn: "9543975937",
                published_year: 283,
                book_type: "printed book",
                page_count: 1500,
                file_size: null,
                author_id: 1,
                category_id: 1,
                created_at: new Date(),
                description: null
            },
            {
                book_id: 2,
                title: "Mahabharata",
                book_isbn: "8525255252",
                published_year: 305,
                book_type: "printed book",
                page_count: 2000,
                file_size: null,
                author_id: 2,
                category_id: 2,
                created_at: new Date(),
                description: null
            },
            {
                book_id: 3,
                title: "Romeo and Juliet",
                book_isbn: "9780141439",
                published_year: 1597,
                book_type: "ebook",
                page_count: null,
                file_size: 45,
                author_id: 3,
                category_id: 3,
                created_at: new Date(),
                description: null
            },
            {
                book_id: 4,
                title: "Pride and Prejudice",
                book_isbn: "9780199518",
                published_year: 1813,
                book_type: "printed book",
                page_count: 432,
                file_size: null,
                author_id: 4,
                category_id: 4,
                created_at: new Date(),
                description: null
            },
            {
                book_id: 5,
                title: "Adventures of Huckleberry Finn",
                book_isbn: "9780142439",
                published_year: 1884,
                book_type: "ebook",
                page_count: null,
                file_size: 24.3,
                author_id: 5,
                category_id: 5,
                created_at: new Date(),
                description: null
            }
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("books", null, {});
    }
};