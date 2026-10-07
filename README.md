# BMS Microservices — Assignment 14

This repository implements the non-AWS Assignment 14 Book Management System as five Node.js/LoopBack services with per-service PostgreSQL databases, synchronous REST calls, RabbitMQ events, Docker Compose, and centralized observability.

## Architecture and service ports

| Component | Host port | Responsibility |
|---|---:|---|
| API Gateway | 3000 | Client entry point; proxies book, author, and category REST requests with downstream timeouts |
| Books Service | 3001 | Book CRUD, validation, author/category REST validation, PostgreSQL persistence, and `book.created` publishing |
| Authors Service | 3002 | Author CRUD and persistence in `authors_db` |
| Categories Service | 3003 | Category CRUD and persistence in `categories_db` |
| Book Events Consumer | 3004 | Consumes book events and exposes consumer metrics |
| Grafana | 3005 | Prometheus dashboards |
| PostgreSQL | 5433 | Separate `books_db`, `authors_db`, and `categories_db` databases |
| RabbitMQ | 5672 | Event broker |
| RabbitMQ Management UI | 15672 | Local broker administration |
| Prometheus | 9090 | Scrapes Books Service and Consumer metrics |
| Jaeger | 16686 | Trace search and UI; OTLP ingestion on 4317 and 4318 |
| OpenSearch | 9200 | Centralized structured application logs |

The gateway uses synchronous REST to call the relevant service. Books Service also calls Authors and Categories Services to validate references before storing a book. Each domain service owns its database.

## RabbitMQ flow and retry handling

After persisting a book, Books Service publishes a `book.created` event. RabbitMQ routes it through the durable `bms.events` exchange and `bms.book.events` queue to Book Events Consumer. Failed processing is retried through `bms.book.events.retry` with a five-second TTL. Messages that exceed the configured retry limit are routed through `bms.dlx` to `bms.book.events.dlq`.

Consumer metrics include `book_events_consumed_total`, `book_events_failed_total`, and `book_events_retried_total`.

## Logging, metrics, and tracing

- Each service uses Winston JSON logging with a Console transport and a custom OpenSearch transport. Set `OPENSEARCH_URL` and `OPENSEARCH_INDEX` to send logs to OpenSearch; Compose sets them to `http://bms-opensearch:9200` and `bms-logs`.
- OpenSearch records `@timestamp`, `level`, `message`, and `service` fields. Service code logs event and CRUD outcomes without request headers, authorization data, or credentials.
- Prometheus scrapes `bms-books-service:3001/metrics` and `bms-book-events-consumer:3004/metrics`. Grafana has a provisioned Prometheus data source and BMS event metrics dashboard.
- OpenTelemetry exports distributed traces to Jaeger. Gateway, Books Service, and Consumer are instrumented for the request-to-event flow.

## Start the local stack

Prerequisites: Docker Desktop with Compose and the repository's ignored local `.env` files configured for PostgreSQL. Compose builds the five service images from their Dockerfiles. It uses the existing `bms-network` Docker network and persistent named volumes; it does not delete or reinitialize persistent data.

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

View service logs or stop the stack:

```powershell
docker compose logs --tail 50 api-gateway books-service book-events-consumer
docker compose down
```

Useful local URLs:

```text
Gateway:       http://127.0.0.1:3000
Grafana:       http://127.0.0.1:3005
Prometheus:    http://127.0.0.1:9090
Jaeger:        http://127.0.0.1:16686
OpenSearch:    http://127.0.0.1:9200
RabbitMQ UI:   http://127.0.0.1:15672
```

The application containers receive service URLs, ports, and logging settings from Compose. Database credentials are supplied through environment variables/local ignored `.env` files. Do not commit `.env` files or put secret values in documentation. OpenSearch's local Compose configuration disables its security plugin for this development stack.

## Tests and quality checks

Each application has its own package directory. Run these commands from a service directory:

```powershell
npm test
npm run lint
npm run build
```

The five applications are `services/api-gateway`, `services/books-service`, `services/authors-service`, `services/categories-service`, and `services/book-events-consumer`.

## Assignment scope

This README documents the implementation present in this repository. AWS deployment is not included in the local Assignment 14 implementation. Authentication and authorization, including JWT, belong to Assignment 15 and are not implemented here.
