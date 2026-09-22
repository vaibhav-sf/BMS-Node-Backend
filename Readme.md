# 📚 BMS Microservices --- Assignment 14

A **Microservices Architecture** implementation of the Book Management
System (BMS) using **LoopBack 4**, with separate services for Books,
Authors, and Categories.

This project is being developed as **Assignment 14** to understand and
implement microservices architecture, service-to-service communication,
API Gateway, asynchronous messaging, observability, containerization,
and AWS deployment.

------------------------------------------------------------------------

## 🎯 Assignment Objective

The objective of this assignment is to redesign the Book Management
System from a monolithic application into independently deployable
microservices.

### Assignment Requirements

1.  Decompose the BMS into independent microservices.
2.  Implement communication between services.
3.  Implement an API Gateway.
4.  Implement asynchronous communication using a message queue.
5.  Add centralized logging and observability.
6.  Add monitoring and metrics.
7.  Add distributed tracing.
8.  Containerize the services.
9.  Deploy the microservices architecture on AWS.
10. Document the complete architecture and implementation.

------------------------------------------------------------------------

## 🏗️ Planned Architecture

``` text
                         ┌──────────────────┐
                         │      Client      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   API Gateway    │
                         └────────┬─────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
     ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
     │ Books Service │    │Authors Service │    │Categories     │
     │    :3001      │    │    :3002      │    │Service :3003  │
     └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
             │                    │                    │
             ▼                    ▼                    ▼
       Books DB              Authors DB           Categories DB
```

Additional infrastructure planned:

``` text
                    ┌───────────────────────┐
                    │     Message Queue     │
                    │   RabbitMQ / Kafka    │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
          Services          Event Consumers    Background Jobs


Observability:

Services
   │
   ├── Logs ──────────────► OpenSearch
   ├── Metrics ───────────► Prometheus ───────► Grafana
   └── Traces ────────────► OpenTelemetry ─────► Jaeger
```

------------------------------------------------------------------------

## 🧩 Microservices

### 1. Books Service

Responsible for:

-   Creating books
-   Reading books
-   Updating books
-   Deleting books
-   Book validation
-   Book-related business logic
-   Communication with other services when required

Current status: **🚧 In Progress**

### 2. Authors Service

Responsible for:

-   Author management
-   Author CRUD operations
-   Author-related business logic
-   Providing author information to other services

Current status: **⏳ Planned**

### 3. Categories Service

Responsible for:

-   Category management
-   Category CRUD operations
-   Category-related business logic
-   Providing category information to other services

Current status: **⏳ Planned**

------------------------------------------------------------------------

## 📁 Project Structure

The project uses a monorepo structure where each microservice is an
independent LoopBack application.

``` text
BMS-Node/
│
├── services/
│   ├── books-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── datasources/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── __tests__/
│   │   │   ├── application.ts
│   │   │   ├── index.ts
│   │   │   ├── migrate.ts
│   │   │   ├── openapi-spec.ts
│   │   │   └── sequence.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── authors-service/       # Planned
│   └── categories-service/    # Planned
│
├── api-gateway/               # Planned
│
├── observability/             # Planned
│   ├── prometheus/
│   ├── grafana/
│   ├── opensearch/
│   └── jaeger/
│
└── README.md
```

------------------------------------------------------------------------

# 🚀 Phase 1 --- Microservices Decomposition

The original BMS application contains multiple domains:

``` text
Book
Author
Category
```

These domains are being separated into independent services.

### Why separate services?

#### Independent Deployment

A change to the Books Service can be deployed without redeploying the
Authors or Categories services.

#### Independent Scaling

A service receiving higher traffic can be scaled independently.

Example:

``` text
Books Service
├── Instance 1
├── Instance 2
└── Instance 3

Authors Service
└── Instance 1
```

#### Failure Isolation

A failure in one service does not necessarily bring down the complete
application.

Service dependencies must still be designed carefully because network
failures can propagate between services.

------------------------------------------------------------------------

# 🔗 Service-to-Service Communication

Microservices communicate through network-based interfaces rather than
directly accessing another service's repository or database.

For example:

``` text
Books Service
      │
      │ HTTP Request
      ▼
Authors Service
      │
      │ HTTP Response
      ▼
Books Service
```

A synchronous REST request may be used when the Books Service
immediately needs author information.

Asynchronous communication through a message broker will be introduced
later for event-driven use cases.

------------------------------------------------------------------------

# 🌐 API Gateway

An API Gateway will act as the single entry point for external clients.

``` text
Client
  │
  ▼
API Gateway
  │
  ├── /books      → Books Service
  ├── /authors    → Authors Service
  └── /categories → Categories Service
```

Planned responsibilities:

-   Request routing
-   Service discovery/routing configuration
-   Centralized entry point
-   Request/response handling
-   Potential rate limiting and other cross-cutting concerns

**Status:** ⏳ Planned

------------------------------------------------------------------------

# 📨 Message Queue

Asynchronous communication will be introduced using a message broker
such as **RabbitMQ or Kafka**.

Example:

``` text
Books Service
      │
      │ BookCreated event
      ▼
 Message Queue
      │
      ├──────────────► Authors-related consumer
      │
      └──────────────► Other consumers
```

Benefits:

-   Loose coupling
-   Asynchronous processing
-   Event-driven architecture
-   Better handling of background tasks

**Status:** ⏳ Planned

------------------------------------------------------------------------

# 📊 Observability

The assignment includes three major observability areas.

## Logging

Planned tools:

-   Winston
-   OpenSearch

Architecture:

``` text
Microservices
     │
     │ Logs
     ▼
 OpenSearch
```

Centralized logging will make it easier to search and analyze logs from
multiple services.

**Status:** ⏳ Planned

------------------------------------------------------------------------

## Monitoring

Planned tools:

-   Prometheus
-   Grafana

Example metrics:

-   Request count
-   Response time
-   Error rate
-   Service availability
-   Throughput

Architecture:

``` text
Services
   │
   ▼
Prometheus
   │
   ▼
Grafana
```

**Status:** ⏳ Planned

------------------------------------------------------------------------

## Distributed Tracing

Planned tools:

-   OpenTelemetry
-   Jaeger

Example request flow:

``` text
Client
  │
  ▼
API Gateway
  │
  ▼
Books Service
  │
  ▼
Authors Service
```

Distributed tracing will allow a request to be followed across multiple
services.

**Status:** ⏳ Planned

------------------------------------------------------------------------

# 🐳 Docker

Each microservice will be independently containerized.

Example:

``` text
┌──────────────────────┐
│ Books Service        │
│ Docker Container     │
└──────────────────────┘

┌──────────────────────┐
│ Authors Service      │
│ Docker Container     │
└──────────────────────┘

┌──────────────────────┐
│ Categories Service   │
│ Docker Container     │
└──────────────────────┘
```

The Books Service already has a generated:

``` text
Dockerfile
.dockerignore
```

**Status:** 🚧 Available for Books Service; full containerized
architecture pending.

------------------------------------------------------------------------

# ☁️ AWS Deployment

The final architecture is planned for deployment on AWS.

Potential AWS components:

  Requirement               AWS / Technology
  ------------------------- -----------------------
  Compute                   EC2 / ECS / Lambda
  API entry                 API Gateway
  Networking                VPC
  Load balancing            Elastic Load Balancer
  Relational database       RDS
  NoSQL where appropriate   DynamoDB
  Object storage            S3
  Access control            IAM
  Containers                Docker / ECS

The exact deployment architecture will be finalized after the local
microservices architecture is working.

**Status:** ⏳ Planned

------------------------------------------------------------------------

# 🛠️ Technology Stack

### Backend

-   Node.js
-   TypeScript
-   LoopBack 4
-   REST APIs

### Database

-   PostgreSQL
-   Database-per-service architecture planned

### Communication

-   REST / HTTP
-   RabbitMQ or Kafka planned for asynchronous communication

### API Gateway

-   API Gateway implementation planned

### Observability

-   Winston
-   OpenSearch
-   Prometheus
-   Grafana
-   OpenTelemetry
-   Jaeger

### Containerization

-   Docker

### Cloud

-   AWS
-   EC2 / ECS / Lambda
-   VPC
-   IAM
-   API Gateway
-   RDS

------------------------------------------------------------------------

# 💻 Local Development

## Prerequisites

Make sure the following are installed:

``` text
Node.js
npm
LoopBack CLI
Git
Docker
PostgreSQL
```

Current development environment:

``` text
Node.js:     v22.18.0
npm:         10.9.3
LoopBack:    7.0.17
```

------------------------------------------------------------------------

## Create a LoopBack Microservice

Example:

``` powershell
mkdir services
cd services
lb4 app books-service
```

The generated Books Service is located at:

``` text
services/books-service
```

------------------------------------------------------------------------

## Run Books Service

``` powershell
cd services/books-service
npm start
```

Current development server:

``` text
http://127.0.0.1:3000
```

Generated health/test endpoint:

``` text
http://127.0.0.1:3000/ping
```

Expected response:

``` json
{
  "greeting": "Hello from LoopBack"
}
```

The service will later use a dedicated port when multiple microservices
are running simultaneously.

------------------------------------------------------------------------

# 🧪 Testing

LoopBack generates a Mocha-based testing setup.

Run tests with:

``` powershell
npm test
```

Build the service with:

``` powershell
npm run build
```

Run linting with:

``` powershell
npm run lint
```

------------------------------------------------------------------------

# 🌿 Git Workflow

Assignment 14 is developed on a dedicated branch:

``` text
main
  │
  └── 14th-assignment
```

Changes should be committed with meaningful messages.

Example:

``` powershell
git add .
git commit -m "feat: initialize books microservice"
git push origin 14th-assignment
```

------------------------------------------------------------------------

# 📌 Development Roadmap

  Phase   Task                                    Status
  ------- --------------------------------------- -----------------------
  1       Understand microservices architecture   ✅ Completed
  2       Create Books Service                    🚧 In Progress
  3       Create Authors Service                  ⏳ Planned
  4       Create Categories Service               ⏳ Planned
  5       Database per service                    ⏳ Planned
  6       REST service-to-service communication   ⏳ Planned
  7       API Gateway                             ⏳ Planned
  8       Message Queue                           ⏳ Planned
  9       Centralized logging                     ⏳ Planned
  10      Prometheus + Grafana monitoring         ⏳ Planned
  11      OpenTelemetry + Jaeger tracing          ⏳ Planned
  12      Dockerize services                      🚧 Partially prepared
  13      AWS deployment                          ⏳ Planned
  14      Final documentation and architecture    ⏳ Planned

------------------------------------------------------------------------

# 🎓 Learning Outcomes

After completing this assignment, the project will demonstrate
understanding of:

-   Microservices architecture
-   Domain decomposition
-   Independent service deployment
-   Independent scaling
-   Failure isolation
-   REST-based service communication
-   API Gateway pattern
-   Event-driven architecture
-   Message queues
-   Database-per-service architecture
-   Centralized logging
-   Metrics and monitoring
-   Distributed tracing
-   Docker containerization
-   AWS deployment
-   Service observability

------------------------------------------------------------------------

# ⚠️ Current Status

The project is currently in the **microservices decomposition and
service creation phase**.

The **Books Service has been successfully generated and tested locally**
using LoopBack 4. The generated `/ping` endpoint is responding
successfully.

The remaining architecture components will be implemented incrementally
rather than installing all infrastructure at once.

------------------------------------------------------------------------

## 👨‍💻 Assignment

**Assignment:** 14 --- Microservices Architecture and LoopBack 4

**Project:** Book Management System --- Microservices

**Framework:** LoopBack 4

**Language:** TypeScript

**Branch:** `14th-assignment`
