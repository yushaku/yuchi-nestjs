# Description

<!--toc:start-->

- [Description](#description)
  - [Requirements](#requirements)
  - [Development](#development)
    - [Setup](#setup)
    - [Database](#database)
    - [Running the App](#running-the-app)
  - [Test](#test)
    - [E2E Tests](#e2e-tests)
  - [Deploy](#deploy)

<!--toc:end-->

Project use [Nest](https://github.com/nestjs/nest) 10 framework TypeScript

## Requirements

- Docker and docker-compose are installed.
- NodeJS version 18 is installed.

## Development

### Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start services with Docker:
   ```bash
   docker-compose up
   ```

### Database

Migrate database schema:
```bash
pnpm db:up
```

Seed database (if needed):
```bash
pnpm db:seed
```

### Running the App

```bash
# Development mode with watch
pnpm dev

# Production mode
pnpm start:prod
```

## Test

### E2E Tests

The project includes end-to-end tests using Jest and Supertest. The test configuration is in the `test/` directory.

**Setup:**

1. The `.env.test` file is already configured and tracked in git. It uses a separate test database (`db_test`).

2. Ensure the test database exists and has the schema applied:
   ```bash
   # Create test database (if not exists)
   createdb db_test
   
   # Apply Prisma schema to test database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db_test?schema=public" pnpm prisma db push --accept-data-loss
   ```

3. Run e2e tests:
   ```bash
   # Run all e2e tests
   pnpm test:e2e
   
   # Run specific test file
   pnpm test:e2e sync.e2e-spec.ts
   ```

**Test Database:**
- Uses `db_test` database (separate from development database)
- Automatically loads `.env.test` file
- Database is cleaned before and after each test run
- See `test/README.md` for more details

## cursor

### Cho Lead:
- Review PRs trong vòng 24h
- Document architectural decisions (ADR)
- Weekly tech debt review
- Maintain coding standards documentation

### Cho Dev:
- Commit frequently với meaningful messages
- Write tests trước khi implement (TDD)
- Refactor sau khi feature hoàn thành
- Document complex logic

### Cho QA:
- Automate repetitive test cases
- Maintain test documentation
- Report bugs với đầy đủ thông tin
- Update test cases khi requirements thay đổi


### 7 bước rõ ràng:

Lead trigger command (/design-system)
Cursor hỏi để clarify requirements
Lead trả lời từng phần
Cursor validate understanding
Lead confirm và trả lời clarifications
Cursor đề xuất architecture chi tiết với:

Component breakdown
Tech choices với reasoning
Trade-offs analysis
Implementation phases
Risk mitigation

Lead feedback và Cursor iterate để adjust
