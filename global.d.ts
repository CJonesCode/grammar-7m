declare module "an-array-of-english-words" {
  const words: string[]
  export default words
}

declare module "didyoumean" {
  const didYouMean: any
  export default didYouMean
}

declare module "nspell" {
  import { Buffer } from "buffer"
  export interface Dictionary {
    aff: Buffer | string
    dic: Buffer | string
  }
  export type NSpell = {
    correct: (word: string) => boolean
    suggest: (word: string, max?: number) => string[]
    add: (word: string, model?: string) => void
  }
  function nspell(dict: Dictionary): NSpell
  export = nspell
}

declare module "dictionary-en" {
  import { Dictionary } from "nspell"
  function load(callback: (err: any, dict: Dictionary) => void): void
  export default load
}
