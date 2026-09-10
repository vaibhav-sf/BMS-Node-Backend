const sequelize = require("./database");

async function testConnection() {
    try{
        await sequelize.authenticate();
        console.log("Database connected successfully");
    } catch (error){
        console.error("Unable to connect to the database");
        console.error(error);
    } finally{
        await sequelize.close();
    }
}

testConnection();