/**
 * A function that, when called, removes an event listener.
 */
export type CancelHandle = () => void;

/**
 * Returns a promise that resolves after the specified delay.
 * @param ms - Number of milliseconds to wait before resolving.
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Converts an HTML string into a typed HTMLElement instance.
 *
 * The markup is inserted into a template element and the first child
 * of the resulting content is returned.
 * @param markup - HTML string representing a single element.
 * @returns The first element parsed from the markup.
 */
export function toHtml<T extends HTMLElement>(markup: string): T {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content.firstElementChild as T;
}

/**
 * Encapsulates secret values with optional obfuscation for non-clear rendering.
 */
export class Secret<T> {
    constructor(private clearContent: T, private obfuscator: (clearValue: T) => T) { }

    /**
     * Reads the secret value.
     * @param clear - When true, returns the original content; otherwise returns obfuscated content.
     */
    read(clear?: boolean): T { return clear ? this.clearContent : this.obfuscator(this.clearContent) }

    /**
     * Serializes the secret for storage or transport.
     */
    toJSON(): any { return this.clearContent }
}


export function sanifyUserAnswer(untrusted: string){
    const textarea = document.createElement("textarea");
    textarea.innerHTML = untrusted;
    return textarea.value;
}