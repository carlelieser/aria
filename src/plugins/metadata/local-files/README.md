# Local Files Provider

Metadata provider for local audio files.

## Features

- In-memory storage of local file references
- Search through local audio files
- File name parsing for basic metadata extraction
- Support for common audio formats (MP3, FLAC, AAC, M4A, WAV, OGG, Opus, WebM)

## Usage

```typescript
import { localFilesProvider } from './plugins/metadata/local-files';

// Initialize the provider
await localFilesProvider.initialize();

// Add a local file
const fileId = localFilesProvider.addLocalFile({
  uri: 'file:///path/to/audio.mp3',
  name: 'Artist - Song Title.mp3',
  size: 5242880, // bytes
  mimeType: 'audio/mpeg',
  duration: 180, // seconds
});

// Search for files
const result = await localFilesProvider.search({
  query: 'song title',
  limit: 20,
});

// Get track info
const trackResult = await localFilesProvider.getTrack(fileId);

// Get stream URL (returns local file URI)
const urlResult = await localFilesProvider.getStreamUrl(fileId);
```

## File Picker Integration

To enable file picking functionality, install expo-document-picker:

```bash
npx expo install expo-document-picker
```

Then uncomment the implementation in the `pickAudioFiles` function.

## File Name Parsing

The provider attempts to parse artist and title from file names using common patterns:

- `Artist - Title.mp3` → Artist: "Artist", Title: "Title"
- `Artist – Title.mp3` → Artist: "Artist", Title: "Title"
- `Artist_-_Title.mp3` → Artist: "Artist", Title: "Title"
- `Title.mp3` → Artist: "Unknown Artist", Title: "Title"

## Persistence

Currently, file references are stored in memory. For persistence across app restarts, integrate with AsyncStorageRepository to save and restore file references.
