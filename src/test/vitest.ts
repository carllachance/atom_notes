type TestCase = {
  name: string;
  fn: () => void | Promise<void>;
};

type Suite = {
  name: string;
  beforeEach: Array<() => void | Promise<void>>;
  tests: TestCase[];
  suites: Suite[];
};

type SpyHandle = {
  mockRestore: () => void;
};

type Store = {
  rootSuites: Suite[];
  suiteStack: Suite[];
  registeredSpies: SpyHandle[];
};

const STORE_KEY = '__atomNotesVitestStore';
const store = ((globalThis as Record<string, unknown>)[STORE_KEY] as Store | undefined) ?? {
  rootSuites: [],
  suiteStack: [],
  registeredSpies: []
};
(globalThis as Record<string, unknown>)[STORE_KEY] = store;

function fail(message: string): never {
  throw new Error(message);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    return aKeys.length === bKeys.length && aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return false;
}

function getCurrentSuite() {
  return store.suiteStack[store.suiteStack.length - 1] ?? null;
}

function ensureSuite(name: string) {
  const suite: Suite = { name, beforeEach: [], tests: [], suites: [] };
  const current = getCurrentSuite();
  if (current) current.suites.push(suite);
  else store.rootSuites.push(suite);
  return suite;
}

export function describe(name: string, fn: () => void) {
  const suite = ensureSuite(name);
  store.suiteStack.push(suite);
  try {
    fn();
  } finally {
    store.suiteStack.pop();
  }
}

export function beforeEach(fn: () => void | Promise<void>) {
  const current = getCurrentSuite();
  if (!current) fail('beforeEach() must be called within describe()');
  current.beforeEach.push(fn);
}

export function it(name: string, fn: () => void | Promise<void>) {
  const current = getCurrentSuite();
  if (!current) fail('it() must be called within describe()');
  current.tests.push({ name, fn });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function matchesObject(received: unknown, expected: unknown): boolean {
  if (!isObject(expected)) return Object.is(received, expected);
  if (!isObject(received)) return false;
  return Object.entries(expected).every(([key, value]) => matchesObject(received[key], value));
}

export function expect(received: unknown) {
  return {
    toBe(expected: unknown) {
      if (!Object.is(received, expected)) {
        fail(`Expected ${JSON.stringify(received)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: unknown) {
      if (!deepEqual(received, expected)) {
        fail(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toMatchObject(expected: unknown) {
      if (!matchesObject(received, expected)) {
        fail(`Expected ${JSON.stringify(received)} to match ${JSON.stringify(expected)}`);
      }
    },
    toHaveLength(expected: number) {
      const length = (received as { length?: number } | null | undefined)?.length;
      if (length !== expected) {
        fail(`Expected length ${String(length)} to be ${expected}`);
      }
    },
    toBeNull() {
      if (received !== null) {
        fail(`Expected ${JSON.stringify(received)} to be null`);
      }
    }
  };
}

function restoreAllMocks() {
  while (store.registeredSpies.length) {
    store.registeredSpies.pop()?.mockRestore();
  }
}

export const vi = {
  spyOn<T extends object, K extends keyof T>(target: T, key: K) {
    const original = target[key];
    const spy = function (this: unknown, ...args: unknown[]) {
      if (spy.impl) return spy.impl.apply(this, args);
      if (typeof original === 'function') {
        return (original as (...params: unknown[]) => unknown).apply(this, args);
      }
      return original;
    } as T[K] & { impl: null | ((...params: unknown[]) => unknown) };

    spy.impl = null;
    target[key] = spy;

    const handle = {
      mockReturnValue(value: unknown) {
        spy.impl = () => value;
        return handle;
      },
      mockImplementation(fn: (...params: unknown[]) => unknown) {
        spy.impl = fn;
        return handle;
      },
      mockRestore() {
        target[key] = original;
      }
    };

    store.registeredSpies.push(handle);
    return handle;
  },
  restoreAllMocks
};

async function runSuite(suite: Suite, parentBeforeEach: Array<() => void | Promise<void>> = [], depth = 0) {
  const inheritedBeforeEach = [...parentBeforeEach, ...suite.beforeEach];
  let passed = 0;
  let failed = 0;
  const prefix = '  '.repeat(depth);
  console.log(`${prefix}${suite.name}`);

  for (const test of suite.tests) {
    restoreAllMocks();
    try {
      for (const hook of inheritedBeforeEach) {
        await hook();
      }
      await test.fn();
      console.log(`${prefix}  ✓ ${test.name}`);
      passed += 1;
    } catch (error) {
      console.log(`${prefix}  ✗ ${test.name}`);
      console.error(error);
      failed += 1;
    } finally {
      restoreAllMocks();
    }
  }

  for (const child of suite.suites) {
    const result = await runSuite(child, inheritedBeforeEach, depth + 1);
    passed += result.passed;
    failed += result.failed;
  }

  return { passed, failed };
}

export async function __run() {
  let passed = 0;
  let failed = 0;
  for (const suite of store.rootSuites) {
    const result = await runSuite(suite);
    passed += result.passed;
    failed += result.failed;
  }
  store.rootSuites.length = 0;
  restoreAllMocks();
  return { passed, failed };
}

export function __reset() {
  store.rootSuites.length = 0;
  store.suiteStack.length = 0;
  restoreAllMocks();
}
