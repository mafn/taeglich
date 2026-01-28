// src/lib/rng.ts

import { TAEGLICH_SALT } from "astro:env/server";

/**
 * A simple string hash function (djb2) to generate a numeric seed from a string key.
 */
export function hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned 32-bit integer
}

/**
 * Generates a deterministic seed for content based on date and salt.
 * Throws if TAEGLICH_SALT is not set (handled by astro:env).
 *
 * Note: Without the private salt, future pairings are predictable.
 */
export function getSeed(
  date: string,
  type: "content" | "theme",
  salt: string = TAEGLICH_SALT,
): number {
  const key = `${date}:${salt}:${type}`;
  return hash(key);
}

// Simple Mulberry32 PRNG for deterministic random numbers from a seed
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
