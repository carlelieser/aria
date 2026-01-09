# Project Guidelines

> A comprehensive guide for building maintainable, testable, and scalable Expo/React Native applications using Clean Architecture principles with TypeScript.

---

## Architecture

Clean Architecture with Feature-First Organization

**Critical Rules:**
- Features NEVER import from other features — extract shared code to `shared/`
- Domain layer contains only pure TypeScript code — no React/React Native imports
- Data layer implements repository contracts defined in domain
- Presentation layer accesses data only through use cases or domain hooks

---

## Code Standards

### Naming Conventions

| Element            | Convention       | Example                                          |
|:-------------------|:-----------------|:-------------------------------------------------|
| Components         | `PascalCase`     | `UserProfile`, `AuthScreen`                      |
| Files (components) | `kebab-case`     | `user-profile.tsx`, `auth-screen.tsx`            |
| Files (non-comp)   | `kebab-case`     | `user-repository.ts`, `use-auth.ts`              |
| Hooks              | `use` prefix     | `useAuth`, `useUserProfile`                      |
| Private members    | `_` prefix       | `_loadData()`, `_isValid`                        |
| Constants          | `SCREAMING_SNAKE`| `DEFAULT_TIMEOUT`, `MAX_RETRIES`                 |
| Types/Interfaces   | `PascalCase`     | `User`, `AuthState`, `UserRepository`            |
| Zustand Actions    | Verb phrases     | `login`, `logout`, `fetchUser`                   |
| Zustand State      | Noun/adjective   | `isLoading`, `user`, `error`                     |

### Functions

**Rules:**
- Maximum 20 lines per function — extract if longer
- ALWAYS use aliased imports when appropriate.
- Single responsibility — one function, one job
- Avoid boolean parameters — use separate methods or options object
- Return early to reduce nesting
- Use object parameters for functions with 3+ parameters

### Components & Classes

**Rules:**
- Maximum 200 lines per file — split if larger
- Prefer composition over inheritance
- Use `readonly` for immutable properties
- Components should be pure/memoized when appropriate
- One exported component per file (private helpers allowed)
- Colocate component-specific styles, types, and utilities

### Immutability

**Rules:**
- Default to `const` for all variables
- Use `readonly` for object properties that shouldn't change
- State updates must be immutable (spread operator, `immer`)
- Use `as const` for literal types

---

**Rules:**
- Define interfaces/types in domain, implement in data
- Export factory functions or singleton instances
- Initialize async dependencies before app render (in `_layout.tsx`)

---

## Error Handling

### Failure Classes

Use discriminated union `Result` type in `core/errors/failures.ts`:

```typescript
type Failure =
  | { type: 'server'; message: string; statusCode: number }
  | { type: 'network'; message: string }
  | { type: 'timeout'; message: string }
  | { type: 'cache'; message: string }
  | { type: 'validation'; message: string; fields: Record<string, string> }
  | { type: 'notFound'; message: string }
  | { type: 'unauthorized'; message: string };
```

### Result Pattern (neverthrow or custom)

- Repository contracts return `Promise<Result<T, Failure>>`
- Use `Result.ok()` for success, `Result.err()` for failures
- Handle both cases with `.match()` or pattern matching in consuming code
- Alternatively, use discriminated unions: `{ success: true; data: T } | { success: false; error: Failure }`

---

## Testing

### Test-Driven Development (TDD)

1. **Red** — Write a failing test first
2. **Green** — Write minimal code to make it pass
3. **Refactor** — Clean up while keeping tests green

### Test Naming Convention

Pattern: `should [expected behavior] when [condition]`

Use Arrange-Act-Assert pattern in test bodies.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
|:-----------|:--------------------------------------------------------|
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no code change                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `chore`    | Build process, dependencies, tooling                    |
| `ci`       | CI configuration                                        |
| `revert`   | Revert a previous commit                                |

---

## Prohibited Practices

### Code Quality

- WRONG: `any` types without explicit justification — use `unknown` and narrow
- WRONG: `console.log()` statements — use a proper logger service
- WRONG: Magic numbers/strings — define named constants
- WRONG: Unused code, imports, or parameters — delete them
- WRONG: Comments that describe *what* code does — code should be self-documenting
- WRONG: `TODO` comments without issue reference
- WRONG: Non-null assertions (`!`) without justification

### Architecture

- WRONG: Business logic in components
- WRONG: Direct API/database calls from presentation layer
- WRONG: Circular dependencies between features
- WRONG: Feature importing from another feature
- WRONG: Data layer types leaking into domain/presentation
- WRONG: Inline styles for anything beyond one-off tweaks

### State Management

- WRONG: Mutable state updates (always use immutable patterns)
- WRONG: `useState` for complex state that should be in Zustand
- WRONG: Duplicating server state in Zustand (use React Query)
- WRONG: Stores depending on other stores directly
- WRONG: Business logic inside components — extract to hooks or use cases

### Testing

- WRONG: Skipping tests for "simple" code
- WRONG: Tests without assertions
- WRONG: Tests that depend on execution order
- WRONG: Flaky tests
- WRONG: Testing implementation details instead of behavior

---

## Code Checklist

Before finalizing anything, you MUST assess against the following checklists:

### Code Quality
- [ ] Code follows architecture guidelines
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings (`npx eslint .`)
- [ ] Code is formatted (`npx prettier --check .`)
- [ ] No unused imports or dead code

### Testing
- [ ] All existing tests pass (`npm test`)
- [ ] New code has appropriate test coverage
- [ ] Tests follow naming conventions

### Documentation
- [ ] Public APIs have JSDoc comments
- [ ] Complex logic has explanatory comments
- [ ] README updated if needed

### Git
- [ ] Commits follow conventional commit format
- [ ] Branch is rebased on latest main
- [ ] No merge commits in feature branch

---

## Expo-Specific Guidelines

### File-Based Routing (Expo Router)

```
app/
├── _layout.tsx              # Root layout (providers, initialization)
├── (auth)/                  # Auth group (unauthenticated routes)
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (app)/                   # Main app group (authenticated routes)
│   ├── _layout.tsx
│   ├── (tabs)/              # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   └── profile.tsx
│   └── settings.tsx
└── +not-found.tsx           # 404 handler
```

### Environment Variables

- Use `expo-constants` for build-time config
- Prefix public vars with `EXPO_PUBLIC_`
- Never commit `.env` files — use `.env.example` as template
- Validate env vars at startup with `zod`

### Native Modules

- Prefer Expo SDK modules over bare React Native packages
- Use `expo-dev-client` for custom native code
- Document any native dependencies in README