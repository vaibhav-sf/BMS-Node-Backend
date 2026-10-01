const {DataTypes} = require("sequelize");
const sequelize = require("../config/database");

const Book = sequelize.define(
    "Book",
    {
        book_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        book_isbn: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
        },
        published_year:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        book_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [["printed book", "ebook"]],
            },
        },
        page_count: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        file_size: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
    },
    {
        tableName: "books",
        timestamps: false
    }
);
module.exports = Book;