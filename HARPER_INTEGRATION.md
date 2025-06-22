# Harper Integration

This document describes the integration of [Harper](https://github.com/Automattic/harper) for grammar and spell checking in the Ship of Thesis application.

## Overview

Harper is an offline, privacy-first grammar checker that provides fast, accurate grammar, spelling, and style suggestions. It's implemented in Rust and compiled to WebAssembly for browser use.

## Implementation

### Files

- `lib/harper-client.ts` - Client-side Harper service implementation
- `app/api/documents/[id]/suggestions/route.ts` - API endpoint for storing suggestions (client-generated)
- `app/editor/[id]/page.tsx` - Editor component using client-side Harper

### Key Features

1. **Privacy-First**: Harper runs entirely in the browser, no text is sent to external servers
2. **Offline Capable**: Once initialized, Harper works without internet connection
3. **Fast Performance**: Written in Rust and compiled to WebAssembly for optimal performance
4. **Comprehensive Checking**: Covers grammar, spelling, and style suggestions
5. **Client-Side Architecture**: Harper runs in the browser where WebAssembly is supported

### Dependencies Removed

The following dependencies have been removed since Harper handles all grammar and spelling functionality:

- `an-array-of-english-words` - Word dictionary
- `didyoumean` - Spelling suggestion library
- `nspell` - Spell checking library

### Architecture

**Client-Side Processing:**
1. User types in the editor
2. Content is debounced (1 second delay)
3. Harper analyzes the text in the browser
4. Suggestions are displayed immediately
5. Suggestions are stored in the database via API

**Server-Side Storage:**
- API endpoint only handles storing suggestions generated on the client
- No grammar processing happens on the server
- Maintains existing database structure and RLS policies

### Usage

#### In the Editor

The editor automatically uses Harper for real-time grammar checking:

1. User types in the editor
2. Content is debounced (1 second delay)
3. Harper analyzes the text in the browser
4. Suggestions are displayed with apply/dismiss options
5. Suggestions are stored in the database

### Configuration

Harper is initialized with default settings in the browser:

```typescript
const harper = new LocalLinter({ binary })
```

The binary module is automatically included from the harper.js package.

### Performance

- **Initialization**: Harper downloads and caches the grammar model on first use (~1-2 seconds)
- **Subsequent Checks**: Very fast, typically < 100ms for standard text
- **Memory Usage**: Minimal, optimized for browser environments
- **Network**: No network requests for grammar checking (privacy-first)

### Error Handling

The implementation includes robust error handling:

1. **Harper Failure**: Returns empty array to avoid breaking the UI
2. **WebAssembly Issues**: Graceful fallback if WASM fails to load
3. **API Errors**: Suggestions still work locally even if database storage fails

### Integration with Database

Suggestions from Harper are stored in the `suggestions` table with the following structure:

- `document_id` - Links to the document
- `start_index` / `end_index` - Character positions in the text
- `suggestion_type` - "grammar", "spelling", or "style"
- `original_text` - The problematic text
- `suggested_text` - Harper's suggested replacement
- `message` - Harper's explanation of the issue

### Benefits Over Previous Implementation

1. **Real Grammar Checking**: Previous implementation was mock data
2. **Privacy**: No external API calls required
3. **Performance**: Faster than cloud-based solutions
4. **Reliability**: Works offline and doesn't depend on external services
5. **Accuracy**: Uses sophisticated language models for better suggestions
6. **Simplified Codebase**: Removed multiple spelling libraries in favor of single Harper solution
7. **Client-Side**: No server-side WebAssembly issues

### Future Enhancements

1. **Custom Rules**: Allow users to add custom grammar rules
2. **Dialect Support**: Support for different English dialects (American, British, etc.)
3. **Context Awareness**: Better suggestions based on document type (academic, technical, etc.)
4. **Performance Monitoring**: Track Harper performance and usage statistics

## Troubleshooting

### Common Issues

1. **Harper not initializing**: Check browser console for WebAssembly errors
2. **Slow performance**: First initialization may take 1-2 seconds
3. **No suggestions**: Verify text contains actual errors, Harper is very accurate
4. **WebAssembly errors**: Ensure browser supports WebAssembly

### Debug Mode

Enable debug logging by setting `DEBUG_LOGGING=true` in your environment variables.

### Error Behavior

If Harper fails, the system returns an empty array to prevent UI breakage. This ensures the application continues to function even if grammar checking is temporarily unavailable.

### Browser Compatibility

Harper requires a modern browser with WebAssembly support:
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+ 