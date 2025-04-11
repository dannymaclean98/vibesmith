# VibeSmiths Makefile Documentation

This document describes the available make commands to simplify development workflow.

## Development Commands

| Command        | Description                  |
| -------------- | ---------------------------- |
| `make dev`     | Start the development server |
| `make build`   | Build the production bundle  |
| `make start`   | Start the production server  |
| `make install` | Install dependencies         |
| `make update`  | Update dependencies          |

## Code Quality Commands

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `make lint`     | Run ESLint to check for code issues     |
| `make lint-fix` | Fix automatically fixable ESLint issues |
| `make format`   | Format code with Prettier               |
| `make types`    | Check TypeScript types                  |
| `make clean`    | Remove build artifacts and caches       |

## Database Commands

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `make db-push`    | Push Prisma schema changes to the database |
| `make db-migrate` | Create a new Prisma migration              |
| `make db-studio`  | Open Prisma Studio to view/edit database   |

## Deployment Commands

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `make docker-build` | Build Docker image           |
| `make docker-run`   | Run Docker container locally |
| `make deploy`       | Deploy to Google Cloud Run   |

## Using Prettier & ESLint

The project is configured with Prettier for code formatting and ESLint for code linting. The configuration integrates both tools to work together.

### Manually Running Commands

If you prefer using npm scripts directly:

```bash
# Format code
npm run format

# Check formatting without changing files
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run typecheck
```

## Pre-commit Hook (Optional)

For an even better developer experience, you can set up a pre-commit hook with Husky to automatically format and lint code before commits:

```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Set up husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Then add to package.json:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "prettier --write",
    "eslint --fix"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```
