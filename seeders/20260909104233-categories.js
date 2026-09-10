"use strict";

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("categories", [
            {
                category_id: 1,
                category_name: "Religious",
                created_at: new Date()
            },
            {
                category_id: 2,
                category_name: "Poetry",
                created_at: new Date()
            },
            {
                category_id: 3,
                category_name: "Romance",
                created_at: new Date()
            },
            {
                category_id: 4,
                category_name: "Adventure",
                created_at: new Date()
            },
            {
                category_id: 5,
                category_name: "Comedy",
                created_at: new Date()
            }
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("categories", null, {});
    }
};