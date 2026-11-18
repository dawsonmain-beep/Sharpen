export type Enhanced = {
  original: string
  optimized: string
  assumptions: string
  breakdown: string
  questions: string
}

declare module 'claude-code' {
  interface PluginState {
    sharpen: { result: Shaped<Enhanced | null>; isBusy: boolean }
  }
}
