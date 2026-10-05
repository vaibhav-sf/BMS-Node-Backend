const {Book, Author, Category} = require("../models/index");

async function getBooksDetails(){
    try{
        const books = await Book.findAll({
            include:[
                {
                    model: Author
                },
                {
                    model: Category
                }
            ]
        });
        console.log("Books with author and category: ");
        books.forEach(book => {
            console.log({
                title: book.title,
                author: `${book.Author.first_name} ${book.Author.last_name}`,
                category: book.Category.category_name
            });
        });
    }
    catch(error){
        console.error("Unable to fetch books detail");
        console.error(error);
    }
}
getBooksDetails();