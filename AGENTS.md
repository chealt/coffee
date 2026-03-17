# Agent Guidelines for Coffee Repository

This monorepo contains an Astro-based website (coffee.chealt.com) and multiple serverless
function packages. It uses Yarn 4 workspaces with Playwright for testing.

## Project Commands

### Root Commands

```bash
yarn install          # Install all dependencies
yarn build            # Build the website
yarn dev              # Start dev server at localhost:4321
yarn lint             # Run ESLint on all files
yarn format           # Format all files with Prettier
```

### Running Tests

```bash
# Run all website tests
yarn workspace @centralbeans/website playwright test

# Run a single test file
yarn workspace @centralbeans/website playwright test src/components/home/home.ui-spec.js

# Run tests matching a pattern
yarn workspace @centralbeans/website playwright test --grep "should render"

# Run specific project (chromium, Mobile Chrome, Mobile Safari)
yarn workspace @centralbeans/website playwright test --project chromium

# Run with UI (for debugging)
yarn workspace @centralbeans/website playwright test --ui
```

### Data Export/Import

```bash
yarn export:data           # Export data (requires .env)
yarn export:data:ci       # Export for CI (no .env)
yarn recommendations:ci   # Generate recommendations for CI
```

## Code Style Guidelines

### General Principles

- Use ES modules (`import`/`export`), not CommonJS
- Enable ESLint rules: prefer-arrow-callback, no-var, object-shorthand, prefer-const
- Use `async`/`await` over raw promises
- Avoid console.log in Astro components (ESLint will error); use it in Node packages

### Imports and Exports

Import order (enforced by ESLint):

1. External packages (node_modules) 2. Internal packages (workspace) 3. Relative imports (../, ./) 4. CSS files

```javascript
import { createClient } from '@libsql/client';
import cheapestCoffees from '@data/cheapestCoffees.json';
import { convertToUSD } from '../coffees/utils.js';
import Coffees from '../coffees/list.astro';
import './styles.css';
```

#### JSON Imports (Astro/Node 24+)

```javascript
import coffeeImages from '../../../data/coffeeImages.json' with { type: 'json' };
```

### Naming Conventions

- **Files**: kebab-case (`home.astro`, `utils.js`)
- **Components**: PascalCase (`Coffees.astro`)
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### Formatting (Prettier)

- Print width: 120, Single quotes: true, Semicolons: true
- Trailing commas: none, Arrow parens: always, Tab width: 2

### Astro Components

```astro
---
import cheapestCoffees from '@data/cheapestCoffees.json';
const t = allLocaleTranslations[Astro.currentLocale];
const { loggedInUser } = Astro.locals;
---

<Common><h1>{t.title}</h1></Common>
```

### Error Handling

- Prefer returning `undefined` over throwing for optional lookups:

```javascript
const getRoaster = (id) => {
  const roaster = roasters.find((r) => r.id === id);
  return roaster ? roaster : undefined;
};
```

- Use logger for errors in server-side code:

```javascript
import logger from '../../server/utils/logger.js';
if (!data) {
  logger.error(new Error(`No data found for id ${id}`));
  return undefined;
}
```

### Testing (Playwright)

Test files: `*.ui-spec.js`, config: `playwright.config.js`

```javascript
import { config, test, expect } from '../../utils/playwright.js';
test('should render the home page', async ({ page }) => {
  await page.goto(config.url);
  await expect(page).toHaveTitle('Central Beans');
});
```

Tests run against `http://localhost:4321` (started automatically by Playwright)

### Environment Variables

- Use `.env` for local development (not committed)
- Use `process.env` or `import.meta.env`
- Cloudflare Workers use `.dev.vars`

## Key Dependencies

- **Astro** 6.x with Cloudflare adapter
- **Playwright** 1.58+ for testing
- **ESLint** 9.x (flat config)
- **Prettier** 3.x
- **Turso** (libSQL) for database
- Node 24+

## Common Tasks

- Add new page: create `src/pages/[locale]/page-name.astro`, use `<Common>`, add translations to `locales.json`
- Run single test: `cd packages/coffee.chealt.com && yarn playwright test src/components/home/home.ui-spec.js`
- Debug tests: `yarn playwright test --ui` / `--headed` / `--debug`
