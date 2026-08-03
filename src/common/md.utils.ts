export type ParsedSectionContent = Record<string, string | string[]>;

export interface ParsedQuizStructure {
    title: string;
    options: ParsedSectionContent;
    sections: { title: string; content: string }[];
}

/** Utility parser helpers for the project's constrained markdown format. */
export class MDUtils {
    private static readonly keyValueLineRegex = /^([A-Za-z0-9_][A-Za-z0-9_-]*)\s*:\s*(.*)$/;
    private static readonly listItemRegex = /^\s*-\s+(.+)$/;

    /**
     * Parse key/value section content where each key is expressed as `key:`.
     *
     * Value forms:
     * - scalar: `key: some value`
     * - list: `key:` followed by `- item` lines (blank lines allowed in between)
     */
    static parseSectionContent(content: string): ParsedSectionContent {
        const lines = content.split(/\r?\n/);
        const result: ParsedSectionContent = {};

        let activeListKey: string | null = null;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i]!;
            const trimmedLine = rawLine.trim();
            const lineNumber = i + 1;

            if (trimmedLine.length === 0) {
                continue;
            }

            const keyMatch = trimmedLine.match(this.keyValueLineRegex);
            if (keyMatch) {
                if (activeListKey) {
                    const pendingList = result[activeListKey];
                    if (!Array.isArray(pendingList) || pendingList.length === 0) {
                        throw new Error(`Invalid section format at line ${lineNumber}: key \"${activeListKey}\" expects at least one list item \"- value\" before defining a new key`);
                    }
                }

                const key = keyMatch[1]!.trim();
                const value = keyMatch[2]!.trim();

                if (key in result) {
                    throw new Error(`Invalid section format at line ${lineNumber}: duplicate key \"${key}\"`);
                }

                if (value.length > 0) {
                    result[key] = value;
                    activeListKey = null;
                } else {
                    result[key] = [];
                    activeListKey = key;
                }
                continue;
            }

            if (activeListKey) {
                const listItemMatch = rawLine.match(this.listItemRegex);
                if (!listItemMatch) {
                    throw new Error(`Invalid section format at line ${lineNumber}: expected list item \"- value\" for key \"${activeListKey}\"`);
                }
                const listItemValue = listItemMatch[1]!.trim();
                if (listItemValue.length === 0) {
                    throw new Error(`Invalid section format at line ${lineNumber}: list item for key \"${activeListKey}\" cannot be empty`);
                }

                (result[activeListKey] as string[]).push(listItemValue);
                continue;
            }

            throw new Error(`Invalid section format at line ${lineNumber}: expected \"<key>: <value>\" or \"<key>:\" before list items`);
        }

        if (activeListKey) {
            const pendingList = result[activeListKey];
            if (!Array.isArray(pendingList) || pendingList.length === 0) {
                throw new Error(`Invalid section format: key \"${activeListKey}\" has no list items`);
            }
        }

        return result;
    }

    /**
     * Ensure that a parsed section only contains keys from the allowed list.
     *
     * When `strict` is false (default), unsupported keys are logged and parsing
     * can continue safely. When `strict` is true, an error is thrown.
     */
    static ensureOnlyAllowedKeys(
        section: ParsedSectionContent,
        allowedKeys: string[],
        sectionName: string = "Section",
        strict: boolean = false,
    ): void {
        const allowedSet = new Set(allowedKeys);
        const unsupported = Object.keys(section).filter((key) => !allowedSet.has(key));
        if (unsupported.length === 0) {
            return;
        }

        const message = `${sectionName} contains unsupported keys: ${unsupported.join(", ")}`;
        if (strict) {
            throw new Error(message);
        }

        console.warn(message);
    }

    /** Parse a required or defaulted scalar string value. */
    static parseString(section: ParsedSectionContent, key: string): string;
    static parseString(section: ParsedSectionContent, key: string, defaultValue: string): string;
    static parseString(section: ParsedSectionContent, key: string, defaultValue?: string): string {
        const value = section[key];
        if (value === undefined) {
            if (arguments.length >= 3) {
                return defaultValue as string;
            }
            throw new Error(`Missing required key \"${key}\"`);
        }
        if (Array.isArray(value)) {
            throw new Error(`Key \"${key}\" must be a string value, not a list`);
        }

        const normalized = value.trim();
        if (normalized.length === 0) {
            throw new Error(`Key \"${key}\" cannot be empty`);
        }
        return normalized;
    }

    /** Parse a required or defaulted boolean value (`true`/`false`). */
    static parseBoolean(section: ParsedSectionContent, key: string): boolean;
    static parseBoolean(section: ParsedSectionContent, key: string, defaultValue: boolean): boolean;
    static parseBoolean(section: ParsedSectionContent, key: string, defaultValue?: boolean): boolean {
        const value = section[key];
        if (value === undefined) {
            if (arguments.length >= 3) {
                return defaultValue as boolean;
            }
            throw new Error(`Missing required key \"${key}\"`);
        }
        if (Array.isArray(value)) {
            throw new Error(`Key \"${key}\" must be \"true\" or \"false\", not a list`);
        }

        const normalized = value.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }
        if (normalized === "false") {
            return false;
        }
        throw new Error(`Key \"${key}\" must be \"true\" or \"false\", received \"${value}\"`);
    }

    /** Parse a required or defaulted numeric value. */
    static parseNumber(section: ParsedSectionContent, key: string): number;
    static parseNumber(section: ParsedSectionContent, key: string, defaultValue: number): number;
    static parseNumber(section: ParsedSectionContent, key: string, defaultValue?: number): number {
        const value = section[key];
        if (value === undefined) {
            if (arguments.length >= 3) {
                return defaultValue as number;
            }
            throw new Error(`Missing required key \"${key}\"`);
        }
        if (Array.isArray(value)) {
            throw new Error(`Key \"${key}\" must be a numeric value, not a list`);
        }

        const parsedNumber = Number(value.trim());
        if (!Number.isFinite(parsedNumber)) {
            throw new Error(`Key \"${key}\" must be a valid number, received \"${value}\"`);
        }
        return parsedNumber;
    }

    /** Parse a required or defaulted list of non-empty strings. */
    static parseStringList(section: ParsedSectionContent, key: string): string[];
    static parseStringList(section: ParsedSectionContent, key: string, defaultValue: string[]): string[];
    static parseStringList(section: ParsedSectionContent, key: string, defaultValue?: string[]): string[] {
        const value = section[key];
        if (value === undefined) {
            if (arguments.length >= 3) {
                return defaultValue as string[];
            }
            throw new Error(`Missing required key \"${key}\"`);
        }
        if (!Array.isArray(value)) {
            throw new Error(`Key \"${key}\" must be a list and use one \"- value\" line per item`);
        }
        if (value.length === 0) {
            throw new Error(`Key \"${key}\" must contain at least one item`);
        }

        const normalized = value.map((item) => item.trim());
        if (normalized.some((item) => item.length === 0)) {
            throw new Error(`Key \"${key}\" cannot contain empty list items`);
        }

        return normalized;
    }

    /**
     * Parse the quiz markdown structure.
     *
     * Expected format:
     * - first non-empty line is a level-1 heading (`# ...`)
     * - optional key/value options block directly after title
     * - one or more level-2 sections (`## ...`) for games
     */
    static parseQuizStructure(md: string): ParsedQuizStructure {
        const lines = md.split(/\r?\n/);

        let index = 0;
        while (index < lines.length && lines[index]!.trim().length === 0) {
            index++;
        }

        if (index >= lines.length) {
            throw new Error("Quiz definition is empty");
        }

        const titleLine = lines[index]!.trim();
        const titleMatch = titleLine.match(/^#\s+(.+)$/);
        if (!titleMatch) {
            throw new Error("Quiz definition must start with a first level heading '# <title>'");
        }

        const title = titleMatch[1]!.trim();
        if (title.length === 0) {
            throw new Error("Quiz definition title cannot be empty");
        }

        index++;
        const optionLines: string[] = [];

        while (index < lines.length) {
            const trimmed = lines[index]!.trim();

            if (trimmed.startsWith("## ")) {
                break;
            }

            if (/^#{1,6}\s+/.test(trimmed)) {
                throw new Error(`Unexpected heading at line ${index + 1}: quiz options area only allows key/value lines or blank lines before game sections`);
            }

            optionLines.push(trimmed);
            index++;
        }

        const optionsText = optionLines.join("\n").trim();
        const options = optionsText.length > 0 ? this.parseSectionContent(optionsText) : {};

        const sections: { title: string; content: string }[] = [];
        let currentSectionTitle: string | null = null;
        let currentSectionContent: string[] = [];

        for (; index < lines.length; index++) {
            const rawLine = lines[index]!;
            const trimmed = rawLine.trim();

            if (trimmed.startsWith("## ")) {
                if (currentSectionTitle !== null) {
                    sections.push({
                        title: currentSectionTitle,
                        content: this.trimBlankEdges(currentSectionContent).join("\n"),
                    });
                }

                const sectionTitle = trimmed.substring(3).trim();
                if (sectionTitle.length === 0) {
                    throw new Error(`Invalid section heading at line ${index + 1}: section title cannot be empty`);
                }

                currentSectionTitle = sectionTitle;
                currentSectionContent = [];
                continue;
            }

            if (/^#{1,6}\s+/.test(trimmed)) {
                throw new Error(`Unexpected heading at line ${index + 1}: only level-2 headings '## <game>' are allowed after quiz title`);
            }

            if (currentSectionTitle === null) {
                if (trimmed.length === 0) {
                    continue;
                }
                throw new Error(`Invalid quiz format at line ${index + 1}: expected a game heading '## <game>'`);
            }

            currentSectionContent.push(rawLine);
        }

        if (currentSectionTitle !== null) {
            sections.push({
                title: currentSectionTitle,
                content: this.trimBlankEdges(currentSectionContent).join("\n"),
            });
        }

        if (sections.length === 0) {
            throw new Error("Quiz definition contains no game sections");
        }

        return { title, options, sections };
    }

    private static trimBlankEdges(lines: string[]): string[] {
        let start = 0;
        let end = lines.length;

        while (start < end && lines[start]!.trim().length === 0) {
            start++;
        }
        while (end > start && lines[end - 1]!.trim().length === 0) {
            end--;
        }

        return lines.slice(start, end);
    }
}