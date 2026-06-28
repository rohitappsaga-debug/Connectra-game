import { customAlphabet } from 'nanoid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export const generateCode = customAlphabet(ALPHABET, 6);

export function generateRoomCode(): string {
  return generateCode();
}

export function generateToken(): string {
  return customAlphabet(ALPHABET, 32)();
}

export function generateId(): string {
  return crypto.randomUUID();
}
