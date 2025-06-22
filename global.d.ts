declare module "an-array-of-english-words" {
  const words: string[]
  export default words
}

declare module "didyoumean" {
  const didYouMean: any
  export default didYouMean
}

// Provide a minimal typing for `process.env` so that referencing it in server and
// shared utilities doesn't require the full Node type definitions.
declare const process: {
  env: Record<string, string | undefined>
} 