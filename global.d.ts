// Provide a minimal typing for `process.env` so that referencing it in server and
// shared utilities doesn't require the full Node type definitions.
declare const process: {
  env: Record<string, string | undefined>
} 