const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: status === 500 ? "Internal Server Error" : err.message
    });
};

module.exports = errorHandler;