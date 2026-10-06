# 📚 BMS Microservices — Assignment 14

Book Management System redesigned as a LoopBack 4 microservices architecture with synchronous REST communication, asynchronous RabbitMQ events, containerization, centralized observability, metrics, and distributed tracing.

> **Assignment:** 14 — Microservices Architecture and LoopBack 4
> **Branch:** `14th-assignment`
> **Framework:** LoopBack 4
> **Language:** TypeScript / Node.js

## 1. Architecture

```text
                           Client
                             │
                             ▼
                    API Gateway :3000
                 ┌───────────┼───────────┐
                 ▼           ▼           ▼
            Books :3001  Authors :3002  Categories :3003
                 │
                 ▼
             PostgreSQL
                 │
                 │ book.created
                 ▼
           RabbitMQ :5672
                 │
                 ▼
       Book Events Consumer :3004

Observability
  Books :3001/metrics ──────┐
  Consumer :3004/metrics ───┼──► Prometheus :9090 ─► Grafana :3005
                            │
  API Gateway ─► Books ─► Consumer ─► Jaeger :16686
```

The architecture uses database-per-service separation:

- `books_db`
- `authors_db`
- `categories_db`

Services communicate over HTTP rather than sharing repositories or application-level database access.

## 2. Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 3000 | Public REST entry point and request proxy |
| Books Service | 3001 | Book CRUD, validation, persistence, event publication |
| Authors Service | 3002 | Author CRUD and persistence |
| Categories Service | 3003 | Category CRUD and persistence |
| Book Events Consumer | 3004 | Consumes `book.created` RabbitMQ events |

Infrastructure:

| Component | Port | Purpose |
|---|---:|---|
| PostgreSQL | 5433 → 5432 | Service databases |
| RabbitMQ | 5672 | Message broker |
| RabbitMQ Management | 15672 | Broker administration |
| Prometheus | 9090 | Metrics collection/querying |
| Grafana | 3005 → 3000 | Metrics dashboards |
| Jaeger | 16686 | Distributed trace UI |
| Jaeger OTLP | 4317/4318 | Trace ingestion |

## 3. API Gateway

The gateway exposes the client-facing API and proxies requests to the internal services.

Gateway routes include:

- `/api/books`
- `/api/authors`
- `/api/categories`
- `/ping`

Outbound gateway requests use a **5-second timeout** so an unavailable downstream service does not leave requests hanging indefinitely.

The `/ping` response intentionally does not expose incoming request headers.

## 4. Books Service

The Books Service provides CRUD operations and validation for books.

Important validation rules include:

- required title
- exactly 10 numeric digits for ISBN
- unique ISBN
- valid `book_type` (`printed book` or `ebook`)
- valid publication year
- positive page count when supplied
- required author and category references

A successful book creation publishes a `book.created` event to RabbitMQ.

## 5. RabbitMQ Event Flow

The event topology uses durable exchanges and queues.

```text
Books Service
    │
    │ publish book.created
    ▼
Exchange: bms.events
    │
    ▼
Queue: bms.book.events
    │
    ▼
Book Events Consumer
```

Retry/DLQ infrastructure:

```text
bms.retry
   │
   ▼
bms.book.events.retry
   │  TTL: 5 seconds
   │
   └────► bms.events / book.created

After max retries
   │
   ▼
bms.dlx
   │
   ▼
bms.book.events.dlq
```

The consumer tracks:

- successful events: `book_events_consumed_total`
- failed events: `book_events_failed_total`
- scheduled retries: `book_events_retried_total`

## 6. Observability

### Logging

Services use structured Winston logging for application and event-processing logs.

### Metrics

Prometheus scrapes:

- `bms-books-service:3001/metrics`
- `bms-book-events-consumer:3004/metrics`

Custom consumer metrics:

```text
book_events_consumed_total
book_events_failed_total
book_events_retried_total
```

The final end-to-end verification confirmed the consumer metric state after a successful `book.created` event:

```text
book_events_consumed_total 1
book_events_failed_total   0
book_events_retried_total  0
```

Prometheus reported the consumer target as `up = 1`.

### Distributed tracing

OpenTelemetry instrumentation is used for service traces.

A verified trace contained all three services:

```text
api-gateway
books-service
book-events-consumer
```

The latest verified trace contained 27 spans across those services.

## 7. Docker

All ten components are orchestrated by the root `docker-compose.yml`:

- PostgreSQL
- RabbitMQ
- Jaeger
- Books Service
- Authors Service
- Categories Service
- Book Events Consumer
- API Gateway
- Prometheus
- Grafana

All application containers use the external Docker network `bms-network`.

Environment-specific secrets are supplied through environment variables. `.env` is ignored by Git.

`.dockerignore` files exclude environment files, credentials/certificates, Git metadata, local tooling, logs, coverage, and other build artifacts from Docker build contexts.

### Start the stack

From the repository root:

```powershell
docker compose up -d
```

### Check services

```powershell
docker compose ps
```

### View logs

```powershell
docker compose logs --tail 50 api-gateway
docker compose logs --tail 50 books-service
docker compose logs --tail 50 book-events-consumer
```

### Stop the stack

```powershell
docker compose down
```

> The current Compose file references prebuilt service images. Build an image explicitly when source changes require a new image, for example:
>
> ```powershell
> docker build -t bms-api-gateway:latest .\services\api-gateway
> docker build -t bms-books-service:latest .\services\books-service
> docker build -t bms-authors-service:latest .\services\authors-service
> docker build -t bms-categories-service:latest .\services\categories-service
> docker build -t bms-book-events-consumer:latest .\services\book-events-consumer
> ```

## 8. Monitoring URLs

When the Compose stack is running locally:

```text
API Gateway:          http://127.0.0.1:3000
Books Service:        http://127.0.0.1:3001
Authors Service:      http://127.0.0.1:3002
Categories Service:   http://127.0.0.1:3003
Consumer:             http://127.0.0.1:3004
Grafana:              http://127.0.0.1:3005
Prometheus:           http://127.0.0.1:9090
Jaeger:               http://127.0.0.1:16686
RabbitMQ UI:          http://127.0.0.1:15672
```

## 9. Testing and Quality Gates

Each application service has been verified with build, tests, ESLint, and Prettier.

Current passing test totals:

| Component | Tests |
|---|---:|
| API Gateway | 3 |
| Books Service | 21 |
| Authors Service | 13 |
| Categories Service | 23 |
| Book Events Consumer | 3 |
| **Total** | **63** |

Run a service test suite with:

```powershell
npm test
```

Build a service with:

```powershell
npm run build
```

Run lint/format checks with:

```powershell
npm run lint
```

## 10. Final End-to-End Flow

A successful final validation followed this path:

```text
POST /api/books
      │
      ▼
API Gateway
      │
      ▼
Books Service
      │
      ├──► PostgreSQL
      │
      └──► RabbitMQ: book.created
                    │
                    ▼
             Book Events Consumer
                    │
                    ▼
              Prometheus metrics
```

The final created book was successfully persisted and its event was consumed.

## 11. Assignment 14 Scope

Assignment 14 focuses on microservices architecture, service communication, gateway routing, asynchronous events, observability, monitoring, tracing, containerization, testing, and local deployment readiness.

**Authentication and authorization are intentionally not included here; those are handled in the next assignment.**

## 12. AWS Deployment

The project is structured for future AWS deployment, but the current Assignment 14 implementation has been validated locally with Docker Compose.

A production AWS deployment should expose the API Gateway through an HTTPS load-balanced entry point while keeping internal microservices, PostgreSQL, RabbitMQ, Prometheus, Jaeger, and administrative interfaces private.

Security hardening for a production AWS deployment remains separate from the current Assignment 14 completion work and should be finalized before public exposure.

## 13. Repository Structure

```text
BMS-Node/
├── services/
│   ├── api-gateway/
│   ├── books-service/
│   ├── authors-service/
│   ├── categories-service/
│   └── book-events-consumer/
├── monitoring/
│   └── prometheus/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 14. Git Workflow

Assignment 14 is developed on:

```text
14th-assignment
```

Before the final commit, review:

```powershell
git status
git diff
```

Do not commit `.env`, credentials, certificates, monitoring backups, or generated artifacts.

## 15. Learning Outcomes

This assignment demonstrates:

- microservices decomposition
- API Gateway pattern
- service-to-service REST communication
- database-per-service architecture
- event-driven communication
- RabbitMQ exchanges, queues, retries, and DLQ
- structured logging
- Prometheus metrics
- Grafana monitoring
- OpenTelemetry instrumentation
- Jaeger distributed tracing
- Docker containerization
- automated build/test/lint/format quality gates
- end-to-end verification of a distributed application
