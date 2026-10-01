const {Book} = require('../models/index');

async function getBooks(){
    try{
        const books = await Book.findAll();
        console.log("Books found", books.length);
        books.forEach(book => {
            console.log(book.toJSON());
        })
    } catch(error){
        console.error("Error in fetching books");
        console.error(error);
    } finally{
        await sequelize.close();
    }
}
getBooks();