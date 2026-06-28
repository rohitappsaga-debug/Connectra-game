import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { userRepo } from '../repositories/index.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '../validation/user.schema.js';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  if (passwordHash === 'anonymous') return false;
  const [salt, hash] = passwordHash.split(':');
  if (!salt || !hash) return false;
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey);
}

export const userService = {
  async register(input: RegisterInput) {
    const [existsEmail, existsUsername] = await Promise.all([
      userRepo.existsByEmail(input.email),
      userRepo.existsByUsername(input.username),
    ]);

    if (existsEmail) throw new ConflictError('Email already registered');
    if (existsUsername) throw new ConflictError('Username already taken');

    const passwordHash = hashPassword(input.password);

    const user = await userRepo.create({
      email: input.email,
      username: input.username,
      passwordHash,
    });

    logger.info('User registered', { userId: user.id, username: user.username });

    return { id: user.id, email: user.email, username: user.username };
  },

  async login(input: LoginInput) {
    const user = await userRepo.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    if (!verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await userRepo.updateLastSeen(user.id);

    return { id: user.id, email: user.email, username: user.username };
  },

  async getProfile(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');
    return { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');

    if (input.username && input.username !== user.username) {
      const exists = await userRepo.existsByUsername(input.username);
      if (exists) throw new ConflictError('Username already taken');
    }

    const updated = await userRepo.update(userId, input);
    return { id: updated.id, email: updated.email, username: updated.username, avatarUrl: updated.avatarUrl };
  },

  async getColorForPlayer(playerIndex: number): Promise<string> {
    return COLORS[playerIndex % COLORS.length];
  },
};
