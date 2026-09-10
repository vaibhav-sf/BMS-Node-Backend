"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("authors", [
            {
                author_id: 1,
                first_name: "Valmiki",
                last_name: "Rishi",
                author_email: "valmiki@example.com",
                author_country: "India",
                created_at: new Date()
            },
            {
                author_id: 2,
                first_name: "Kalidasa",
                last_name: "Rishi",
                author_email: "kalidasa@example.com",
                author_country: "India",
                created_at: new Date()
            },
            {
                author_id: 3,
                first_name: "William",
                last_name: "Shakespeare",
                author_email: "william@example.com",
                author_country: "England",
                created_at: new Date()
            },
            {
                author_id: 4,
                first_name: "Jane",
                last_name: "Austen",
                author_email: "jane@example.com",
                author_country: "England",
                created_at: new Date()
            },
            {
                author_id: 5,
                first_name: "Mark",
                last_name: "Twain",
                author_email: "mark@example.com",
                author_country: "USA",
                created_at: new Date()
            }
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("authors", null, {});
    }
};