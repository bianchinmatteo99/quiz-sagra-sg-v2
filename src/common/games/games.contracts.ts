/**
 * Shared game contracts and lightweight type guards.
 *
 * This module is intentionally dependency-free and contains only serializable
 * shapes plus validation helpers, so it is safe to import from every frontend
 * surface (admin, user, display, and presenter) without pulling in runtime
 * orchestration code.
 */
export interface GameDefinitionData {
    /** Discriminator used by registries and concrete game implementations. */
    kind: string;
    /** Human-readable game name shown in UI. */
    name: string;
    /** Optional UI title override for screens that render headings. */
    title?: string;
}

/**
 * Base persisted snapshot shape for game runtime state.
 *
 * Concrete game snapshots should extend this contract and add their own
 * state fields while preserving the same identity metadata.
 */
export interface GameStateSnapshotBase {
    /** Discriminator identifying which game owns the snapshot payload. */
    kind: string;
    /** Human-readable game name persisted alongside state. */
    name: string;
    /** Optional persisted title shown by consumers when available. */
    title?: string;
}

/**
 * Narrow unknown input values to plain object records.
 *
 * Used by snapshot decoders before reading keyed properties.
 * @param value Unknown value to validate.
 * @returns `true` when `value` is a non-null object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
