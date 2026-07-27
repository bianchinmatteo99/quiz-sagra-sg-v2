export interface GameDefinitionData {
    kind: string;
    name: string;
    title?: string;
}

export interface GameStateSnapshotBase {
    kind: string;
    name: string;
    title?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
