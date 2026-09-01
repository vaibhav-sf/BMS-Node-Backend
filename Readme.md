# 📚 Book Management System — Backend

A RESTful backend API for managing books, built with **Node.js** and **Express.js**. The API provides endpoints to create, read, update, and delete book records.

## 🚀 Features

* RESTful API architecture
* Create, read, update, and delete books
* Request logging middleware
* Centralized error handling
* JSON request and response handling
* Modular Express.js routing
* Environment-based configuration
* GitHub Packages integration

## 🛠️ Tech Stack

* **Node.js** — JavaScript runtime
* **Express.js** — Web framework
* **npm** — Package management
* **JavaScript** — Programming language
* **Git & GitHub** — Version control and repository management
* **GitHub Packages** — Package registry

## 📁 Project Structure

```text
BMS-Node-Backend/
│
├── src/
│   ├── controllers/
│   │   └── bookController.js
│   │
│   ├── middleware/
│   │   ├── logger.js
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   └── bookRoutes.js
│   │
│   └── server.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## ⚙️ Installation

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* Git

### Clone the repository

```bash
git clone <repository-url>
```

### Navigate to the project

```bash
cd BMS-Node-Backend
```

### Install dependencies

```bash
npm install
```

## ▶️ Running the Application

Start the development server:

```bash
npm run dev
```

Or start the application normally:

```bash
npm start
```

The API will be available at:

```text
http://localhost:3000
```

## 🔗 API Endpoints

### Books

| Method | Endpoint     | Description       |
| ------ | ------------ | ----------------- |
| GET    | `/books`     | Get all books     |
| GET    | `/books/:id` | Get a book by ID  |
| POST   | `/books`     | Create a new book |
| PUT    | `/books/:id` | Update a book     |
| DELETE | `/books/:id` | Delete a book     |

### Example Book

```json
{
  "id": 1,
  "title": "The Alchemist",
  "author": "Paulo Coelho",
  "price": 299
}
```

## 📡 API Usage

### Get all books

```http
GET /books
```

### Get a book

```http
GET /books/1
```

### Create a book

```http
POST /books
Content-Type: application/json
```

Request body:

```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "price": 499
}
```

### Update a book

```http
PUT /books/1
Content-Type: application/json
```

### Delete a book

```http
DELETE /books/1
```

## 🧱 Middleware

The application uses Express middleware for handling common request-processing tasks.

### Request Logger

Logs incoming requests with their HTTP method and URL.

```text
GET /books
POST /books
DELETE /books/1
```

### Error Handler

A centralized error-handling middleware manages application errors and returns consistent JSON responses.

Example:

```json
{
  "message": "Book not found"
}
```

## 📦 Package Management

Project dependencies are managed using npm. GitHub Packages is used for package registry integration where required.

## 🔐 Environment Variables

Environment-specific configuration can be stored in a `.env` file.

Example:

```env
PORT=3000
```

> Do not commit sensitive environment variables or credentials to the repository.

## 🧪 Testing the API

You can test the API using tools such as **Postman**, **Insomnia**, or any REST API client.

Test the following operations:

```text
GET     /books
GET     /books/:id
POST    /books
PUT     /books/:id
DELETE  /books/:id
```

## 📌 Future Improvements

* Add MongoDB/MySQL database integration
* Add input validation
* Add authentication and authorization
* Add pagination and search
* Add automated API tests
* Add API documentation with Swagger

## 👨‍💻 Author

**Vaibhav Sharma**
