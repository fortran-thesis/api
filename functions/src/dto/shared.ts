/**
 * Shared Zod primitives used across all DTO files.
 *
 * - `zTimestamp`         – Accepts an ISO-8601 string from the client and
 *                          transforms it into a Firestore `Timestamp`.
 * - `FirestoreIdSchema`  – Factory for Firestore document-ID validation.
 * - `FirebaseAuthIdSchema` – Pre-built schema for Firebase Auth UIDs (28 chars).
 */
import {z} from "zod";
import {Timestamp} from "firebase-admin/firestore";

// ── Timestamp ────────────────────────────────────────────────────────────────

/**
 * Zod schema that accepts an ISO-8601 date-time string and transforms it into
 * a Firestore `Timestamp`.  Use this wherever a DTO field maps to a
 * `Timestamp` column in Firestore.
 *
 * Client sends:  `"2026-01-15T08:30:00.000Z"`
 * Parsed output: `Timestamp` instance
 */
export const zTimestamp = z
  .string()
  .datetime({message: "Must be a valid ISO-8601 date-time string"})
  .transform((val) => Timestamp.fromDate(new Date(val)));

/**
 * Optional variant — allows the field to be omitted / undefined.
 */
export const zTimestampOptional = zTimestamp.optional();

// ── Firestore document ID ────────────────────────────────────────────────────

const ID_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Returns a Zod string schema that validates a Firestore auto-generated
 * document ID.
 *
 * @param length  Exact expected length (default **20** — Firestore auto-IDs).
 * @param label   Human-readable label used in error messages (default `"ID"`).
 */
export const FirestoreIdSchema = (length = 20, label = "ID") =>
  z
    .string({required_error: `${label} is required`})
    .nonempty({message: `${label} is required`})
    .min(length, {message: `${label} must be exactly ${length} characters`})
    .max(length, {message: `${label} must be exactly ${length} characters`})
    .regex(ID_REGEX, {message: `${label} format is invalid`});

/**
 * Pre-built schema for Firebase Authentication UIDs (28 characters).
 */
export const FirebaseAuthIdSchema = (label = "User ID") =>
  z
    .string({required_error: `${label} is required`})
    .nonempty({message: `${label} is required`})
    .min(28, {message: `${label} must be exactly 28 characters`})
    .max(28, {message: `${label} must be exactly 28 characters`})
    .regex(ID_REGEX, {message: `${label} format is invalid`});

/**
 * Flexible ID schema that accepts both Firestore auto-IDs (20 chars) and
 * Firebase Auth UIDs (28 chars).  Use when a route may receive either kind.
 */
export const FlexibleIdSchema = (label = "ID") =>
  z
    .string({required_error: `${label} is required`})
    .nonempty({message: `${label} is required`})
    .min(20, {message: `${label} must be at least 20 characters`})
    .max(28, {message: `${label} must be at most 28 characters`})
    .regex(ID_REGEX, {message: `${label} format is invalid`});
