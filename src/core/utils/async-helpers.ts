/**
 * 异步辅助函数
 * @module @chips/foundation/core/utils/async-helpers
 */

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时的 Promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true, shouldRetry = () => true } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const waitTime = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await delay(waitTime);
    }
  }

  throw lastError;
}

/**
 * 并行执行多个 Promise，限制并发数
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined) {
      continue;
    }

    const promise = fn(item, i).then((result) => {
      results[i] = result;
    });

    const e: Promise<void> = promise.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });
    executing.push(e);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 顺序执行多个 Promise
 */
export async function sequential<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined) {
      continue;
    }
    results.push(await fn(item, i));
  }

  return results;
}

/**
 * 防抖函数（异步版本）
 */
export function debounceAsync<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  waitMs: number
): T {
  let timeoutId: NodeJS.Timeout | undefined;
  let pendingPromise: Promise<ReturnType<T>> | undefined;
  let resolvePromise: ((value: ReturnType<T>) => void) | undefined;

  return ((...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<ReturnType<T>>((resolve) => {
        resolvePromise = resolve;
      });
    }

    timeoutId = setTimeout(async () => {
      const result = await fn(...args);
      resolvePromise?.(result);
      pendingPromise = undefined;
      resolvePromise = undefined;
    }, waitMs);

    return pendingPromise;
  }) as T;
}

/**
 * 节流函数（异步版本）
 */
export function throttleAsync<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  waitMs: number
): T {
  let lastTime = 0;
  let pendingPromise: Promise<ReturnType<T>> | undefined;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();

    if (now - lastTime >= waitMs) {
      lastTime = now;
      return fn(...args);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<ReturnType<T>>((resolve) => {
        setTimeout(async () => {
          lastTime = Date.now();
          const result = await fn(...args);
          pendingPromise = undefined;
          resolve(result);
        }, waitMs - (now - lastTime));
      });
    }

    return pendingPromise;
  }) as T;
}

/**
 * 创建可取消的 Promise
 */
export function cancellable<T>(
  executor: (signal: AbortSignal) => Promise<T>
): {
  promise: Promise<T>;
  cancel: () => void;
} {
  const controller = new AbortController();

  const promise = executor(controller.signal);

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

/**
 * 等待所有 Promise 完成，收集结果和错误
 */
export async function settleAll<T>(
  promises: Promise<T>[]
): Promise<{ fulfilled: T[]; rejected: unknown[] }> {
  const results = await Promise.allSettled(promises);

  const fulfilled: T[] = [];
  const rejected: unknown[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value);
    } else {
      rejected.push(result.reason);
    }
  }

  return { fulfilled, rejected };
}
