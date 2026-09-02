# 📚 Book Management System — Backend

A simple RESTful backend API for managing books, built with **Node.js** and **Express.js**.

This project demonstrates the fundamentals of building a backend API, including Express routing, RESTful CRUD operations, request logging, JSON request handling, modular routing, and centralized error handling.

## 🚀 Features

- RESTful API architecture
- Create, read, update, and delete books
- Get a book by ID
- Request logging middleware
- Centralized error handling
- 404 route handling
- JSON request and response handling
- Modular Express.js routing
- In-memory book data storage

## 🛠️ Tech Stack

- **Node.js** — JavaScript runtime
- **Express.js** — Web framework
- **JavaScript** — Programming language
- **npm** — Package management
- **Git & GitHub** — Version control and repository management

## 📁 Project Structure

```text
BMS-Node-Backend/
│
├── middleware/
│   ├── logger.js
│   └── errorHandler.js
│
├── routes/
│   └── bookRoutes.js
│
├── node_modules/
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## ⚙️ Installation

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git

### Clone the Repository

```bash
git clone https://github.com/vaibhav-sf/BMS-Node-Backend.git
```

### Navigate to the Project

```bash
cd BMS-Node-Backend
```

### Install Dependencies

```bash
npm install
```

## ▶️ Running the Application

Start the server with:

```bash
node server.js
```

The API will be available at:

```text
http://localhost:3000
```

When the server starts successfully, you should see:

```text
Server is running on http://localhost:3000
```

## 🔗 API Endpoints

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books` | Get all books |
| GET | `/books/:id` | Get a book by ID |
| POST | `/books` | Create a new book |
| PUT | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |

## 📖 Book Data

The application currently uses an in-memory array to store books.

Example:

```json
{
  "id": 1,
  "title": "Ramayana",
  "author": "Valmiki",
  "year": 1500
}
```

Initial books:

```json
[
  {
    "id": 1,
    "title": "Ramayana",
    "author": "Valmiki",
    "year": 1500
  },
  {
    "id": 2,
    "title": "Mahabharata",
    "author": "Vyasa",
    "year": 1400
  }
]
```

## 📡 API Usage

### Get All Books

```http
GET /books
```

Example response:

```json
[
  {
    "id": 1,
    "title": "Ramayana",
    "author": "Valmiki",
    "year": 1500
  },
  {
    "id": 2,
    "title": "Mahabharata",
    "author": "Vyasa",
    "year": 1400
  }
]
```

### Get a Book by ID

```http
GET /books/1
```

Example response:

```json
{
  "id": 1,
  "title": "Ramayana",
  "author": "Valmiki",
  "year": 1500
}
```

If the book does not exist:

```json
{
  "message": "Book not found"
}
```

### Create a Book

```http
POST /books
Content-Type: application/json
```

Request body:

```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "year": 2018
}
```

Example response:

```json
{
  "id": 3,
  "title": "Atomic Habits",
  "author": "James Clear",
  "year": 2018
}
```

### Update a Book

```http
PUT /books/1
Content-Type: application/json
```

Request body:

```json
{
  "title": "Ramayana - Updated",
  "author": "Valmiki",
  "year": 1500
}
```

### Delete a Book

```http
DELETE /books/1
```

Example response:

```json
{
  "message": "Book deleted successfully",
  "book": {
    "id": 1,
    "title": "Ramayana",
    "author": "Valmiki",
    "year": 1500
  }
}
```

## 🧱 Middleware

The application uses Express middleware to handle common request-processing tasks.

### JSON Middleware

Express's built-in JSON middleware is used to parse JSON request bodies:

```javascript
app.use(express.json());
```

This allows data sent in a POST or PUT request to be accessed through:

```javascript
req.body
```

### Request Logger

The custom logger middleware records incoming requests by logging the HTTP method and URL.

Example:

```text
GET /books
GET /books/1
POST /books
DELETE /books/1
```

### 404 Middleware

A fallback middleware handles requests to routes that do not exist.

Example:

```json
{
  "message": "Route not found"
}
```

### Error Handler

A centralized error-handling middleware handles application errors and returns a consistent response.

Example:

```json
{
  "message": "Internal Server Error"
}
```

## 🗂️ Modular Routing

Book-related routes are separated into:

```text
routes/bookRoutes.js
```

The router is connected to the main Express application using:

```javascript
app.use("/books", bookRoutes);
```

This keeps `server.js` clean and makes the API easier to maintain.

## 📦 Package Management

Project dependencies are managed using **npm**.

The main dependency currently used by the application is:

- Express.js

Dependency information is stored in:

```text
package.json
```

and exact installed dependency versions are tracked in:

```text
package-lock.json
```

## 🧪 Testing the API

The API can be tested using tools such as:

- Postman
- Insomnia
- Browser
- Any REST API client

Test the following endpoints:

```text
GET     /books
GET     /books/:id
POST    /books
PUT     /books/:id
DELETE  /books/:id
```

Additional routes for testing middleware:

```text
GET     /
GET     /error
GET     /unknown-route
```

## 📌 Current Limitations

- Book data is stored in memory.
- Data is reset whenever the server restarts.
- No database is currently connected.
- Input validation has not been implemented.
- Authentication and authorization are not implemented.

## 🚀 Future Improvements

- Add MongoDB or MySQL database integration
- Add input validation
- Add authentication and authorization
- Add pagination and search
- Add automated API tests
- Add API documentation with Swagger

## 👨‍💻 Author

**Vaibhav Sharma**

GitHub: [vaibhav-sf](https://github.com/vaibhav-sf)