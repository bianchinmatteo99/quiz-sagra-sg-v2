/**
 * Compatibility barrel for admin-side Guess Song components.
 *
 * New code can import granular modules directly, while legacy imports from
 * this path continue to resolve to definition, model, view, and controller.
 */
export * from "./v2.guess_song.admin.definition";
export * from "./v2.guess_song.admin.model";
export * from "./v2.guess_song.admin.view";
export * from "./v2.guess_song.admin.controller";