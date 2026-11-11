import { randomUUID } from 'node:crypto';

export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Every test gets its own user so tests stay independent and can run in parallel.
 * The password satisfies Juice Shop's strength meter (upper, lower, digit, symbol, 12+ chars).
 */
export function newUser(prefix = 'qa'): UserCredentials {
  return {
    email: `${prefix}.${randomUUID().slice(0, 8)}@quality-suite.test`,
    password: `Qa!${randomUUID().slice(0, 8)}Aa1`,
  };
}

/** Products seeded in every Juice Shop instance, used as stable test data. */
export const products = {
  appleJuice: 'Apple Juice (1000ml)',
  applePomace: 'Apple Pomace',
  bananaJuice: 'Banana Juice (1000ml)',
} as const;
