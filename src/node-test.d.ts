declare module 'node:assert/strict' {
  const assert: {
    deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
    equal: (actual: unknown, expected: unknown, message?: string) => void;
  };
  export default assert;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
}
