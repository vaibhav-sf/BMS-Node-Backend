const {Book, sequelize} = require("../models/index");

async function testCRUD(){
    try{
        //CREATE
        const newBook = await Book.create({
        book_id: 6,
        title: "Sequelize Testing Book",
        book_isbn: "8439493834",
        published_year: 2015,
        book_type: "ebook",
        page_count: null,
        file_size: 43,
        author_id: 2,
        category_id: 4,
        });
        console.log("Book Created: ");
        console.log(newBook.toJSON());

        // READ
        const book = await Book.findByPk(6);
        console.log("Book found: ");
        console.log(book.toJSON());

        //UPDATE
        await Book.update(
            {
                title: "Verified Book"
            },
            {
                where: {
                    book_id: 6
                }
            }
        );

        // DELETE
        await Book.destroy(
            {
                where: {
                    book_id: 6
                }
            }
        );
        console.log("Book deleted successfully");
    } catch(error){
        console.error("Failed CRUD Operations");
        console.error(error);
    } finally{
        await sequelize.close();
    }
}
testCRUD();