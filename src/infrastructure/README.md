# Infrastructure Layer

The infrastructure layer contains concrete implementations of domain interfaces and plugin systems. This layer depends on the domain layer but is independent of the application layer.

## Directory Structure

```
infrastructure/
├── storage/                    # Storage implementations
│   ├── async-storage-repository.ts
│   └── index.ts
├── playback/                   # Playback implementations
│   ├── expo-av-adapter.ts
│   └── index.ts
├── di/                         # Dependency injection
│   ├── container.ts
│   └── index.ts
└── index.ts
```

## Components

### Storage

#### AsyncStorageRepository

Implementation of `StorageRepository` using React Native's AsyncStorage.

**Features:**
- Automatic key prefixing with `@aria:` to avoid conflicts
- JSON serialization/deserialization
- Result type for error handling
- Batch operations support
- Key filtering by prefix

**Usage:**

```typescript
import { asyncStorageRepository } from '@/infrastructure/storage';

// Save data
await asyncStorageRepository.set('user-settings', {
  theme: 'dark',
  volume: 0.8,
});

// Load data
const result = await asyncStorageRepository.get<UserSettings>('user-settings');
if (result.success) {
  console.log(result.data);
}

// Check if key exists
const hasResult = await asyncStorageRepository.has('user-settings');

// Get multiple keys
const keysResult = await asyncStorageRepository.getKeys('settings:');
```

### Playback

#### ExpoAVPlaybackProvider

Implementation of `PlaybackProvider` using Expo AV for audio playback.

**Features:**
- Streaming audio support
- Background playback capability
- Lock screen controls
- Queue management
- Position tracking (1-second intervals)
- Auto-advance to next track
- Volume control
- Event emission for state changes

**Events:**
- `status-change` - Playback status changed
- `track-change` - Current track changed
- `position-change` - Playback position updated
- `volume-change` - Volume changed
- `queue-change` - Queue modified
- `error` - Playback error occurred

**Usage:**

```typescript
import { expoAVPlaybackProvider } from '@/infrastructure/playback';

// Initialize
await expoAVPlaybackProvider.initialize();

// Listen to events
const cleanup = expoAVPlaybackProvider.addEventListener((event) => {
  switch (event.type) {
    case 'status-change':
      console.log('Status:', event.status);
      break;
    case 'track-change':
      console.log('Now playing:', event.track?.title);
      break;
  }
});

// Play a track
await expoAVPlaybackProvider.play(track, streamUrl);

// Control playback
await expoAVPlaybackProvider.pause();
await expoAVPlaybackProvider.resume();
await expoAVPlaybackProvider.seek(Duration.fromSeconds(30));
await expoAVPlaybackProvider.setVolume(0.5);

// Queue management
await expoAVPlaybackProvider.setQueue([track1, track2, track3], 0);
expoAVPlaybackProvider.addToQueue([track4]);
await expoAVPlaybackProvider.skipToNext();

// Cleanup
cleanup();
await expoAVPlaybackProvider.dispose();
```

### Dependency Injection

#### Container Initialization

The DI container wires up all infrastructure dependencies.

**Usage:**

```typescript
import { initializeContainer, disposeContainer } from '@/infrastructure/di';

// Initialize during app startup
await initializeContainer();

// Access services
import { getStorageRepository, getPlaybackProvider } from '@/infrastructure/di';

const storage = getStorageRepository();
const playback = getPlaybackProvider();

// Cleanup during app shutdown
await disposeContainer();
```

## Plugin System

### Metadata Providers

#### LocalFilesProvider

Metadata provider for local audio files stored on the device.

**Features:**
- In-memory file storage
- File name parsing for basic metadata
- Search functionality
- Stream URL resolution (returns file URI)
- Support for common audio formats

**File Picker Integration:**

To enable file picking, install expo-document-picker:

```bash
npx expo install expo-document-picker
```

Then use the `pickAudioFiles` helper (implementation in the module).

## Architecture Notes

### Dependency Flow

```
Presentation Layer (React Components)
        ↓
Application Layer (Services, State)
        ↓
Domain Layer (Entities, Interfaces)
        ↓
Infrastructure Layer (Implementations) ← YOU ARE HERE
```

### Plugin Architecture

All plugins implement the `BasePlugin` interface:

- **PlaybackProvider**: Handles audio playback
- **MetadataProvider**: Provides track metadata and search

Plugins are registered in the DI container with unique keys:
- `PlaybackProvider` - The active playback provider
- `MetadataProvider:{id}` - Metadata providers by ID

### Error Handling

All infrastructure methods use the `Result<T, E>` type for explicit error handling:

```typescript
const result = await storage.get('key');

if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

This eliminates the need for try-catch blocks and makes error handling explicit.

## Testing

### Unit Testing

Test implementations using mocks:

```typescript
import { AsyncStorageRepository } from '@/infrastructure/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('AsyncStorageRepository', () => {
  it('should store and retrieve data', async () => {
    const repo = new AsyncStorageRepository();
    await repo.set('test', { foo: 'bar' });
    const result = await repo.get('test');
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

Test the full stack with real implementations:

```typescript
import { initializeContainer, getPlaybackProvider } from '@/infrastructure/di';

describe('Infrastructure Integration', () => {
  beforeAll(async () => {
    await initializeContainer();
  });

  afterAll(async () => {
    await disposeContainer();
  });

  it('should play audio', async () => {
    const playback = getPlaybackProvider();
    await playback.play(mockTrack, mockStreamUrl);
    expect(playback.getStatus()).toBe('playing');
  });
});
```

## Next Steps

1. **Add YouTube Music Provider**: Implement `MetadataProvider` for YouTube Music using `youtubei.js`
2. **Add Sync Provider**: Implement cross-device synchronization
3. **Add Lyrics Provider**: Fetch synchronized lyrics
4. **Implement Caching**: Add caching layer for metadata and artwork
5. **Add Offline Support**: Download tracks for offline playback
