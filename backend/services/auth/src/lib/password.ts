import bcrypt from 'bcrypt';

const DEFAULT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt.
 * @param password - Plaintext password
 * @param rounds - Bcrypt cost factor (default 10)
 * @returns Hashed password string
 */
export async function hashPassword(password: string, rounds: number = DEFAULT_ROUNDS): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * @param password - Plaintext password to verify
 * @param hash - Stored bcrypt hash
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
