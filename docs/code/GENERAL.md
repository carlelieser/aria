# General Standards

Cross-cutting practices that apply regardless of where you're writing code.

---

## Dependencies & Libraries

### Before Writing New Code

Always check for existing solutions before implementing anything custom.

1. **Check the codebase** — search for existing utilities, helpers, or services that solve the problem
2. **Check installed packages** — review `package.json` for dependencies that already provide the functionality
3. **Search for established packages** — look for well-maintained, TypeScript-first external packages
4. **Write custom code** — only as a last resort

### Package Selection Criteria

When evaluating a new dependency, it MUST meet these criteria:

- Active maintenance (recent commits, responsive issues)
- TypeScript support (built-in types, not `@types/` bolted on)
- Minimal transitive dependencies
- Acceptable bundle size impact for client-side code
- Compatible license

### What Not to Add

- MUST NOT add packages for trivial functionality (< 20 lines of custom code)
- MUST NOT add a package that duplicates functionality already available in an installed dependency
- MUST NOT reimplement something that an installed package already provides

---

## Error Handling

### Result Pattern

Domain and application code MUST NOT throw exceptions. Use the `Result` type to represent success or failure.

> The canonical type definitions live in the codebase. The following are reference copies.

```ts
type Result<T, E = Failure> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

```ts
type Failure =
  | { type: 'network' | 'timeout' | 'unknown'; message: string; cause?: Error }
  | { type: 'server'; message: string; statusCode: number }
  | { type: 'validation'; message: string; fields: Record<string, string> }
  | { type: 'notFound'; message: string; resource: string }
  | { type: 'unauthorized' | 'forbidden'; message: string };
```

### Usage

```ts
// DO — return Result from domain/application code
async function getTrack(id: string): Promise<Result<Track>> {
  const track = await repository.findById(id);
  if (!track) {
    return { ok: false, error: { type: 'notFound', message: `Track ${id} not found`, resource: 'track' } };
  }
  return { ok: true, value: track };
}

// DO — handle Result at the call site
const result = await getTrack(id);
if (!result.ok) {
  logger.warn('Track lookup failed', { error: result.error });
  return;
}
const track = result.value;

// DON'T — throw from domain/application code
async function getTrack(id: string): Promise<Track> {
  const track = await repository.findById(id);
  if (!track) throw new Error('Track not found'); // PROHIBITED
  return track;
}
```

### Error Boundaries

- Domain and application layers MUST return `Result` — never throw
- Exceptions MUST be caught at system boundaries (API calls, UI event handlers, plugin initialization)
- MUST preserve error context using the `cause` property when wrapping errors

```ts
// DO — catch at the boundary, preserve context
try {
  const response = await fetch(url);
  return { ok: true, value: await response.json() };
} catch (error) {
  return { ok: false, error: { type: 'network', message: 'Request failed', cause: error as Error } };
}
```

---

## Logging

### Log Levels

| Level | When to Use |
|---|---|
| `error` | Unrecoverable failures — something is broken and needs attention |
| `warn` | Recoverable issues — degraded behavior, fallbacks activated |
| `info` | Business events — user actions, state transitions, lifecycle milestones |
| `debug` | Diagnostics — detailed data useful during development or troubleshooting |

### Rules

- MUST use the project's logger service — `console.log()` is prohibited
- MUST use structured logging with metadata objects
- MUST NOT log secrets, tokens, passwords, or PII

```ts
// DO
import { getLogger } from '@shared/services/logger';
const logger = getLogger('PlaybackService');

logger.info('Track playback started', { trackId: track.id, source: 'queue' });
logger.error('Stream resolution failed', { trackId: track.id, error: result.error });

// DON'T
console.log('Playing track:', track.id);        // PROHIBITED
logger.info(`Token: ${user.accessToken}`);       // PROHIBITED — leaks secrets
```

---

## Testing

### TDD Workflow

Testing follows strict TDD: **Red -> Green -> Refactor**.

1. **Red** — Write a failing test that describes the expected behavior
2. **Green** — Write the minimum code to make the test pass
3. **Refactor** — Clean up the implementation while keeping tests green

### Test Runner

Tests use **Vitest** as the test runner and assertion library.

### Naming

Tests MUST follow this naming pattern:

```
should [expected behavior] when [condition]
```

```ts
// DO
it('should return notFound error when track does not exist', () => { /* ... */ });
it('should add track to queue when queue is not full', () => { /* ... */ });

// DON'T
it('test getTrack', () => { /* ... */ });
it('works correctly', () => { /* ... */ });
```

### Arrange-Act-Assert

Every test MUST follow the AAA pattern. One assertion concept per test.

```ts
// DO
it('should format duration as mm:ss when given seconds', () => {
  // Arrange
  const seconds = 185;

  // Act
  const result = formatDuration(seconds);

  // Assert
  expect(result).toBe('3:05');
});

// DON'T — multiple unrelated assertions
it('should format duration', () => {
  expect(formatDuration(185)).toBe('3:05');
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration(-1)).toBe('0:00');
  expect(formatTrackLabel(track)).toBe('Song (3:05)'); // unrelated assertion
});
```

### Isolation

- Tests MUST be independent — no shared mutable state between tests
- Tests MUST NOT depend on execution order
- External dependencies (APIs, storage, filesystem) MUST be mocked
- MUST use dependency injection to make mocking straightforward

```ts
// DO — inject the dependency, mock in tests
class TrackService {
  constructor(private readonly _repository: TrackRepository) {}

  async getTrack(id: string): Promise<Result<Track>> {
    return this._repository.findById(id);
  }
}

// Test
const mockRepository: TrackRepository = {
  findById: vi.fn().mockResolvedValue({ ok: true, value: mockTrack }),
};
const service = new TrackService(mockRepository);
```

### What to Test

- MUST test behavior, not implementation details
- MUST test edge cases and error paths
- MUST NOT test private methods directly — test through the public API
- MUST NOT test framework internals (React rendering, navigation plumbing)

---

## Documentation

### Comments

Comments MUST explain **why**, not **what**. The code itself should communicate what it does.

```ts
// DO — explains reasoning
// Delay queue processing to avoid race condition with track player initialization
await sleep(100);

// DON'T — restates the code
// Wait 100ms
await sleep(100);
```

### Public APIs

Exported functions, classes, and interfaces that serve as boundaries between modules SHOULD have JSDoc.

```ts
/**
 * Resolves the best available audio stream for a track,
 * checking local downloads first before falling back to remote sources.
 */
async function resolveAudioStream(track: Track): Promise<Result<AudioStream>> {
  // ...
}
```

### TODOs

TODOs MUST include an issue reference. Orphaned TODOs without tracking are prohibited.

```ts
// DO
// TODO(#142): Add retry logic for transient network failures

// DON'T
// TODO: fix this later
// FIXME: doesn't work sometimes
```

---

## Git

### Commit Messages

MUST follow conventional commit format:

```
type(scope): description
```

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, whitespace (no logic changes) |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, or dependency changes |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

```
feat(player): add sleep timer with configurable duration
fix(library): prevent duplicate tracks on re-import
refactor(search): unify filter stores into single module
```

### Branches

MUST follow the pattern:

```
feature/[id]-short-description
fix/[id]-short-description
```

```
feature/142-sleep-timer
fix/155-duplicate-track-import
```

### Workflow

- MUST use rebase workflow
- MUST NOT create merge commits in feature branches
- MUST keep commits atomic — one logical change per commit

---

## Security

- MUST NOT commit secrets, API keys, tokens, or credentials — use environment variables
- MUST validate all inputs at system boundaries (user input, API responses, plugin data)
- MUST sanitize outputs (no raw user input rendered without escaping)
- MUST validate environment variable schema at application startup

```ts
// DO — validate at the boundary
function parseApiResponse(data: unknown): Result<Track[]> {
  if (!Array.isArray(data)) {
    return { ok: false, error: { type: 'validation', message: 'Expected array', fields: {} } };
  }
  // validate each item...
}

// DON'T — trust external data
const tracks = (await response.json()) as Track[]; // PROHIBITED — no validation
```

---

## Prohibited Patterns

| Violation | Correction |
|---|---|
| `console.log()` | Use logger service |
| Throwing from domain/application | Return `Result` |
| TODOs without issue reference | Add issue reference: `TODO(#123)` |
| Secrets in source code | Use environment variables |
| Trusting external data | Validate at system boundaries |
| Merge commits in feature branches | Use rebase workflow |
| Order-dependent tests | Isolate tests — no shared state |
| Skipped tests (`.skip`) | Fix or remove |
| Reimplementing installed dependencies | Use what's already installed |
| Writing code before checking deps | Check dependencies first |
