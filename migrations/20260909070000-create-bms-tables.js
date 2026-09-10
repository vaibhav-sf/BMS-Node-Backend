"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {

        // Create authors table
        await queryInterface.createTable("authors", {
            author_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false
            },
            first_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            last_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            author_email: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true
            },
            author_country: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            }
        });

        // Create categories table
        await queryInterface.createTable("categories", {
            category_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false
            },
            category_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            }
        });

        // Create books table
        await queryInterface.createTable("books", {
            book_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false
            },
            title: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            book_isbn: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true
            },
            published_year: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            book_type: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            page_count: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            file_size: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            author_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "authors",
                    key: "author_id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            category_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "categories",
                    key: "category_id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
            }
        });
    },

    async down(queryInterface) {

        // Remove books first because it has foreign keys
        await queryInterface.dropTable("books");

        // Then remove categories and authors
        await queryInterface.dropTable("categories");
        await queryInterface.dropTable("authors");
    }
};