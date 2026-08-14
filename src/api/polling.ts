/**
 * Polling utility for handling eventual consistency in CQRS systems.
 *
 * Used when the command-side response doesn't guarantee the query-side
 * projection is immediately available, which can happen under high load
 * or on slower machines.
 */

export interface PollingConfig {
  initialDelayMs?: number
  backoffMultiplier?: number
  maxTimeoutMs?: number
}

const DEFAULT_CONFIG: Required<PollingConfig> = {
  initialDelayMs: 50,
  backoffMultiplier: 1.5,
  maxTimeoutMs: 10000,
}

/**
 * Poll with exponential backoff until a condition is met or timeout.
 *
 * @param predicate Function (sync or async) that returns true when the condition is met
 * @param config Polling configuration
 * @returns true if predicate returned true, false if timeout
 */
export async function pollUntilFound(
  predicate: () => boolean | Promise<boolean>,
  config?: PollingConfig
): Promise<boolean> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()
  let delayMs = finalConfig.initialDelayMs

  while (Date.now() - startTime < finalConfig.maxTimeoutMs) {
    if (await predicate()) {
      return true
    }

    await sleep(delayMs)
    delayMs = Math.min(
      Math.ceil(delayMs * finalConfig.backoffMultiplier),
      finalConfig.maxTimeoutMs / 2
    )
  }

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
