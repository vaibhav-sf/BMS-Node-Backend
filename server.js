const express = require("express");
const logger = require("./middleware/logger.js");
const errorHandler = require("./middleware/errorHandler.js");
const bookRoutes = require("./routes/bookRoutes.js");
const app = express();

let port = 3000

app.use(express.json());
app.use(logger);
app.use("/books", bookRoutes);

app.get("/", (req, res) => {
    res.send("BMS backend server is running");
});

app.get("/error", (req, res, next) => {
    const error = new Error("This is a test error");
    next(error)
});

app.use((req, res, next) => {
    res.status(404).json({
        message: "Route not found"
    })
});

app.use(errorHandler);

// Only start listening when run directly (e.g. `node server.js`), so tests can
// import `app` and drive it with supertest without opening a real port.
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`)
    });
}

module.exports = app;