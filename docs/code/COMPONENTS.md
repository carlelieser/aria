# Component Standards

React Native component conventions for consistency, performance, and maintainability.

---

## Component Patterns

### Functional Components Only

All components MUST be function components. Class components are prohibited — no exceptions.

```tsx
// DO
function TrackCard({ title, artist }: TrackCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.artist}>{artist}</Text>
    </View>
  );
}

// DON'T
class TrackCard extends React.Component<TrackCardProps> {
  render() {
    return (/* ... */);
  }
}
```

### Props

Props MUST be declared as an `interface`, co-located directly above the component.

- MUST name props `{ComponentName}Props`
- MUST destructure props in the function signature
- MUST use `readonly` on all prop fields
- SHOULD prefer explicit props over spreading

```tsx
// DO
interface TrackCardProps {
  readonly title: string;
  readonly artist: string;
  readonly onPress: () => void;
}

function TrackCard({ title, artist, onPress }: TrackCardProps) {
  // ...
}

// DON'T — anonymous inline types
function TrackCard({ title, artist }: { title: string; artist: string }) {
  // ...
}

// DON'T — prop spreading hides what a component accepts
function TrackCard({ ...props }: TrackCardProps) {
  return <Pressable {...props} />;
}
```

### Children

When a component accepts children, type it explicitly — do not rely on `PropsWithChildren`.

```tsx
interface CardProps {
  readonly title: string;
  readonly children: React.ReactNode;
}
```

### Exports

- **Screens** MUST use `default` export (one per file)
- **Reusable components** MUST use `named` export

```tsx
// Screen — default export
export default function LibraryScreen() { /* ... */ }

// Reusable component — named export
export function TrackCard({ title }: TrackCardProps) { /* ... */ }
```

### Container / Presentational Split

MUST separate data logic from rendering.

**Containers** handle data fetching, state, and side effects. They pass data down to presentational components as props.

**Presentational components** receive all data via props, contain no business logic, and are purely concerned with how things look.

```tsx
// Container — handles data and state
export default function LibraryScreen() {
  const tracks = useLibraryTracks();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => tracks.filter((t) => t.title.includes(filter)),
    [tracks, filter],
  );

  return <TrackList tracks={filtered} onFilterChange={setFilter} />;
}

// Presentational — pure UI, all data from props
interface TrackListProps {
  readonly tracks: readonly Track[];
  readonly onFilterChange: (value: string) => void;
}

export function TrackList({ tracks, onFilterChange }: TrackListProps) {
  return (
    <View>
      <SearchInput onChangeText={onFilterChange} />
      <FlashList data={tracks} renderItem={({ item }) => <TrackRow track={item} />} />
    </View>
  );
}
```

### Composition Over Configuration

Prefer composing small components over building large configurable ones with many conditional branches.

```tsx
// DO — compose small, focused components
function TrackCard({ track }: TrackCardProps) {
  return (
    <Card>
      <Artwork uri={track.artworkUri} />
      <TrackInfo title={track.title} artist={track.artist} />
      <TrackActions trackId={track.id} />
    </Card>
  );
}

// DON'T — monolithic component with flags
function TrackCard({ track, showArtwork, showActions, compact }: TrackCardProps) {
  return (
    <View style={compact ? styles.compact : styles.full}>
      {showArtwork && <Image source={{ uri: track.artworkUri }} />}
      <Text>{track.title}</Text>
      {showActions && (/* ... */)}
    </View>
  );
}
```

### File Size Limits

A single component file MUST NOT exceed **200 lines**. When a component outgrows this limit, it MUST be extracted into its own directory.

**Simple components** — a single file is fine:

```
components/
  track-card.tsx        # under 200 lines, self-contained
```

**Components exceeding the limit** — MUST become a directory. The shape depends on complexity.

Lean split (small directories):

```
components/
  progress-track/
    index.tsx           # main component, re-exports public API
    types.ts            # props interfaces, local types
    track-bar.tsx       # subcomponent
    thumb.tsx           # subcomponent
```

Full split (complex components):

```
components/
  progress-track/
    index.tsx           # main component, re-exports public API
    types.ts            # props interfaces, local types
    hooks.ts            # custom hooks (useThumbGesture, useProgressAnimation)
    utils.ts            # pure helper functions (calculations, formatters)
    styles.ts           # StyleSheet.create definitions
    track-bar.tsx       # subcomponent
    thumb.tsx           # subcomponent
```

Rules:

- `index.tsx` MUST be the entry point — consumers import from the directory, never from internal files
- Internal files MUST NOT be imported from outside the directory
- Types shared with consumers MUST be re-exported from `index.tsx`
- Subcomponents that are only used within the directory MUST NOT be exported from `index.tsx`
- SHOULD prefer the lean split unless the component has custom hooks, significant utility logic, or large style definitions

### Hooks Rules

- MUST only call hooks at the top level — never inside loops, conditions, or nested functions
- Custom hooks MUST start with `use`
- Custom hooks MUST be extracted to their own file
- SHOULD keep hook count per component reasonable (< 8); extract a custom hook if growing

---

## JSX Cleanliness

JSX MUST be declarative and immediately readable. All logic — computations, conditionals, style resolution — MUST be resolved **above** the `return` statement. The JSX tree should read like a description of what renders, not how to compute it.

### No Complex Expressions in JSX

Expressions inside JSX MUST be simple references or single-level conditions. If an expression requires mental parsing to understand, it belongs in a variable above the return.

```tsx
// DO — pre-compute everything, JSX just references values
function ProgressThumb({ variant, activeEnd, isDisabled }: ThumbProps) {
  const thumbStyle = styles[`${variant}Thumb`];
  const thumbOffset = activeEnd - THUMB_SIZES[variant] / 2;

  return (
    <Animated.View
      style={[
        thumbAnimatedStyle,
        thumbStyle,
        { left: thumbOffset, backgroundColor: colors.primary },
        isDisabled && styles.thumbDisabled,
      ]}
    />
  );
}

// DON'T — nested ternaries and arithmetic inside JSX
<Animated.View
  style={[
    thumbAnimatedStyle,
    isBasic ? styles.basicThumb : isVariant ? styles.variantThumb : styles.thumb,
    {
      left:
        activeEnd -
        (isBasic
          ? BASIC_THUMB_SIZE / 2
          : isVariant
            ? VARIANT_HANDLE_WIDTH / 2
            : THUMB_SIZE / 2),
      backgroundColor: colors.primary,
    },
    isDisabled && styles.thumbDisabled,
  ]}
/>
```

### No Nested Ternaries

Ternary expressions in JSX MUST NOT be nested. A single ternary is acceptable for simple either/or rendering. Anything more complex MUST be extracted.

```tsx
// DO — single ternary is fine
{isLoading ? <Spinner /> : <Content />}

// DO — extract to a variable for multiple branches
const statusIcon = isError ? <ErrorIcon /> : isComplete ? <CheckIcon /> : <PendingIcon />;

return <View>{statusIcon}</View>;

// DON'T — nested ternary in JSX
{isError ? <ErrorIcon /> : isComplete ? <CheckIcon /> : <PendingIcon />}
```

For three or more branches, prefer a lookup object or helper function.

```tsx
// DO — lookup object for multiple variants
const STATUS_ICONS = {
  error: ErrorIcon,
  complete: CheckIcon,
  pending: PendingIcon,
} as const;

function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  return <Icon />;
}
```

### Conditional Rendering

Use short-circuit (`&&`) for show/hide. Use a single ternary for either/or. Use early returns for state-based rendering.

```tsx
// DO — short-circuit for optional elements
{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

// DO — early returns for state branching
if (isLoading) return <Spinner />;
if (error) return <ErrorView error={error} />;

return <ContentView data={data} />;

// DON'T — deeply nested conditionals in JSX
<View>
  {isLoading ? (
    <Spinner />
  ) : error ? (
    <ErrorView />
  ) : data ? (
    <ContentView data={data} />
  ) : (
    <EmptyState />
  )}
</View>
```

### Keep Return Blocks Shallow

The JSX returned from a component SHOULD have minimal nesting depth. If the tree is deeply nested, extract inner sections into their own components.

```tsx
// DO — flat, scannable JSX
function PlayerControls({ track }: PlayerControlsProps) {
  return (
    <View style={styles.container}>
      <TrackInfo track={track} />
      <ProgressBar />
      <TransportButtons />
      <VolumeSlider />
    </View>
  );
}

// DON'T — deeply nested inline JSX
function PlayerControls({ track }: PlayerControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.artwork}>
          <Image source={{ uri: track.artworkUri }} style={styles.image} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>
        </View>
      </View>
      <View style={styles.controls}>
        {/* ...more nesting... */}
      </View>
    </View>
  );
}
```

---

## Styling

### StyleSheet.create Only

All styles MUST be defined using `StyleSheet.create`. Inline style objects are prohibited.

```tsx
// DO
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

// DON'T — inline style objects cause re-renders
<View style={{ flex: 1, padding: 16 }}>
```

### Dynamic Styles

For values that change at runtime, use a style-building function or array syntax.

```tsx
// DO — array syntax for conditional composition
<View style={[styles.container, isActive && styles.active]} />

// DO — function for truly dynamic values (e.g., from props/state)
function getProgressStyle(width: number): ViewStyle {
  return { width: `${width}%` };
}

<View style={[styles.bar, getProgressStyle(progress)]} />
```

### Style Organization

- Styles MUST be defined at the bottom of the component file
- MUST co-locate styles with the component that uses them
- Shared styles (typography, spacing, colors) MUST be extracted to a theme or shared style module
- MUST NOT duplicate style values — reference theme constants

```tsx
// DO — reference theme constants
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
});

// DON'T — magic values
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
});
```

### Platform-Specific Styles

Use `Platform.select` for platform-specific values. Keep platform differences minimal and isolated.

```tsx
const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

---

## State & Data Flow

### Local State

Use `useState` for UI-only state that doesn't need to be shared (toggle visibility, form inputs, scroll position).

```tsx
// Local UI state — no need for a store
const [isExpanded, setIsExpanded] = useState(false);
```

### Global State (Zustand)

Use Zustand stores for state shared across components or that persists across navigation.

- MUST select only the slices you need — never subscribe to the entire store
- MUST keep stores focused on a single domain
- MUST NOT put server/cache state in Zustand — that belongs in TanStack Query

```tsx
// DO — select specific slices
const volume = usePlayerStore((s) => s.volume);
const setVolume = usePlayerStore((s) => s.setVolume);

// DON'T — subscribe to entire store (triggers re-render on any change)
const store = usePlayerStore();
```

### Data Fetching (TanStack Query)

All server data MUST be fetched via TanStack Query hooks (`useQuery`, `useMutation`).

- Query keys MUST be descriptive and hierarchical
- MUST handle loading, error, and empty states explicitly
- MUST NOT duplicate server state into Zustand

```tsx
// DO
function useAlbumTracks(albumId: string) {
  return useQuery({
    queryKey: ['albums', albumId, 'tracks'],
    queryFn: () => fetchAlbumTracks(albumId),
  });
}

// Usage in a container
export default function AlbumScreen({ albumId }: AlbumScreenProps) {
  const { data: tracks, isLoading, error } = useAlbumTracks(albumId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!tracks?.length) return <EmptyState message="No tracks found" />;

  return <TrackList tracks={tracks} />;
}
```

### Loading / Error / Empty States

Every data-driven screen MUST handle all three states explicitly. Do not render components with undefined or null data.

```tsx
// DO — explicit state handling
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data?.length) return <EmptyState />;

return <ContentView data={data} />;

// DON'T — optimistic rendering with optional chaining
return <Text>{data?.title}</Text>;
```

### State Transitions

UI state changes SHOULD animate where possible and appropriate. Abrupt visual changes — elements appearing, disappearing, resizing, or changing state without transition — create a jarring experience.

- SHOULD use `Animated` or `react-native-reanimated` to transition between visual states
- SHOULD animate layout changes (appearing/disappearing elements, size changes)
- SHOULD transition opacity, position, and color rather than snapping
- MUST NOT block interaction during transitions — keep animations non-blocking
- MUST NOT animate when `prefers-reduced-motion` is enabled (respect accessibility)
- MAY skip animation for trivial or high-frequency updates (e.g., real-time progress, typing indicators)

---

## Performance

### Memoization

Use memoization intentionally — not by default.

- `React.memo` — MUST use for presentational components that receive stable props but whose parent re-renders frequently
- `useMemo` — MUST use for expensive computations (filtering, sorting, transforming large lists)
- `useCallback` — MUST use for callbacks passed to memoized children or list items

```tsx
// DO — memoize a presentational component rendered in a list
export const TrackRow = React.memo(function TrackRow({ track, onPress }: TrackRowProps) {
  return (
    <Pressable onPress={() => onPress(track.id)}>
      <Text>{track.title}</Text>
    </Pressable>
  );
});

// DO — memoize an expensive filter
const filtered = useMemo(
  () => tracks.filter((t) => matchesSearch(t, query)),
  [tracks, query],
);

// DO — stable callback for memoized children
const handlePress = useCallback((id: string) => {
  navigation.navigate('Track', { id });
}, [navigation]);
```

Do not wrap everything in `useMemo`/`useCallback`. Memoization has a cost — only apply it where profiling shows a benefit or where the pattern clearly warrants it (list items, expensive derivations).

### Lists

- MUST use `FlashList` for all scrollable lists by default
- MAY use `FlatList` for simple, short, or non-performance-critical lists
- MUST provide `estimatedItemSize` for FlashList
- MUST extract `renderItem` to a named function or component — never inline
- MUST provide a stable `keyExtractor`

```tsx
// DO
function renderTrackItem({ item }: { item: Track }) {
  return <TrackRow track={item} />;
}

function TrackList({ tracks }: TrackListProps) {
  return (
    <FlashList
      data={tracks}
      renderItem={renderTrackItem}
      keyExtractor={(item) => item.id}
      estimatedItemSize={64}
    />
  );
}

// DON'T — inline renderItem
<FlashList
  data={tracks}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
    </View>
  )}
/>
```

### Re-render Prevention

- MUST NOT create objects, arrays, or functions inline in JSX (creates new references every render)
- MUST NOT pass anonymous arrow functions as props to memoized components
- MUST select Zustand state with granular selectors

```tsx
// DO
const headerStyle = useMemo(() => [styles.header, { height }], [height]);

// DON'T — new array reference every render
<View style={[styles.header, { height }]} />
```

---

## Quick Reference

| Rule | Requirement |
|---|---|
| Class components | PROHIBITED |
| Props typing | `interface {Name}Props` with `readonly` fields |
| Screen exports | `default` export |
| Component exports | `named` export |
| Component file > 200 lines | PROHIBITED — extract to directory |
| Importing directory internals | PROHIBITED — use `index.tsx` exports only |
| Container / Presentational | MANDATORY split |
| Nested ternaries in JSX | PROHIBITED — extract to variable or lookup |
| Complex expressions in JSX | PROHIBITED — pre-compute above return |
| Deeply nested conditional rendering | PROHIBITED — use early returns |
| Inline styles | PROHIBITED |
| Style definition | `StyleSheet.create` at file bottom |
| Magic style values | PROHIBITED — use theme constants |
| Server state in Zustand | PROHIBITED — use TanStack Query |
| Zustand full-store subscribe | PROHIBITED — select slices |
| Loading/error/empty states | MANDATORY for all data-driven screens |
| List component | FlashList default, FlatList acceptable |
| Inline `renderItem` | PROHIBITED |
| State transitions | SHOULD animate — no jarring snaps |
