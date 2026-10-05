const Author = require("./Author");
const Book = require("./Book");
const Category = require("./Category");

Author.hasMany(Book, {
    foreignKey: "author_id",
});

Book.belongsTo(Author, {
    foreignKey: "author_id",
});

Category.hasMany(Book, {
    foreignKey: "category_id",
});

Book.belongsTo(Category, {
    foreignKey: "category_id",
});

module.exports = {
    Author, Book, Category
};