const sequelize = require("../config/database");
const {Book} = require("./index");

async function testTransaction(){
    const transaction = await sequelize.transaction();
    try{
        const newBook = await Book.create(
            {
                book_id: 6,
                title: "Transaction Test Book",
                book_isbn: "9999923233",
                published_year: 2025,
                book_type: "printed book",
                page_count: 64,
                file_size: null,
                author_id: 1,
                category_id: 3,
            },
            {
                transaction
            }
        );
        console.log("Book created inside transaction");
        console.log(newBook.toJSON());
        // await transaction.commit();                // FOR COMMIT
        // console.log("Transaction successful!");
        throw new Error("Something went wrong! Rolling back transaction");   // FOR ROLLBACK

    } catch(error){
        await transaction.rollback();
        console.error("Transaction failed!");
        console.error(error);

    } finally{
        await sequelize.close();
    }
};
testTransaction();
