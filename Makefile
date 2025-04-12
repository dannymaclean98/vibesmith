# VibeSmiths - Next.js Project Makefile

# Variables
NPM := npm
NODE := node

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make dev              - Start development server"
	@echo "  make build            - Build production bundle"
	@echo "  make start            - Start production server"
	@echo "  make lint             - Run ESLint"
	@echo "  make lint-fix         - Run ESLint with --fix flag"
	@echo "  make format           - Format code with Prettier"
	@echo "  make clean            - Remove build artifacts and caches"
	@echo "  make db-push          - Push Prisma schema to database"
	@echo "  make db-migrate       - Create a new Prisma migration"
	@echo "  make types            - Generate TypeScript types"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make docker-run       - Run Docker container locally"
	@echo "  make deploy           - Deploy to Google Cloud Run"
	@echo "  make deploy-prod      - Deploy to Google Cloud Run with production environment"
	@echo "  make setup-db         - Setup Cloud SQL database"

# Development
.PHONY: dev
dev:
	$(NPM) run dev

# Build
.PHONY: build
build:
	$(NPM) run build

# Start production server
.PHONY: start
start:
	$(NPM) run start

# Linting
.PHONY: lint
lint:
	$(NPM) run lint

.PHONY: lint-fix
lint-fix:
	$(NPM) run lint -- --fix

# Formatting with Prettier
.PHONY: format
format:
	$(NPM) run format || echo "Run 'npm install -D prettier' to setup formatting"

# Clean build artifacts and caches
.PHONY: clean
clean:
	rm -rf .next
	rm -rf out
	rm -rf .eslintcache
	rm -rf node_modules/.cache

# Database operations
.PHONY: db-push
db-push:
	npx prisma db push

.PHONY: db-migrate
db-migrate:
	@read -p "Enter migration name: " name; \
	npx prisma migrate dev --name $$name

.PHONY: db-studio
db-studio:
	npx prisma studio

# TypeScript types generation
.PHONY: types
types:
	$(NPM) run typecheck || echo "Add 'typecheck': 'tsc --noEmit' to package.json scripts"

# Docker commands
.PHONY: docker-build
docker-build:
	docker build -t vibesmith:latest .

.PHONY: docker-run
docker-run:
	docker run -p 3000:3000 --env-file .env vibesmith:latest

# Deployment
.PHONY: deploy
deploy:
	./deploy-cloud-run.sh

# Deploy with production environment
.PHONY: deploy-prod
deploy-prod:
	./deploy-cloud-run.sh -p

# Setup Cloud SQL database
.PHONY: setup-db
setup-db:
	./setup-cloud-sql.sh

# Install dependencies
.PHONY: install
install:
	$(NPM) install

# Update dependencies
.PHONY: update
update:
	$(NPM) update

# Test (if you add tests in the future)
.PHONY: test
test:
	$(NPM) test || echo "No tests configured" 