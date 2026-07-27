# Games folder guide

This folder contains the shared contracts, base classes, and registry entry points used to add a new game to the quiz system.

The code in here is organized around one rule: each game should expose one stable serialized definition, then provide the concrete runtime, display, and presenter implementations that consume that definition.

## What belongs here

- Shared game contracts and helper types in the root of this folder.
- One subfolder per game implementation.
- Registry files that connect a game kind to its builder, manager, display chooser, and presenter renderer.

## Recommended folder layout

Use a lowercase folder name for each game, and keep the file names aligned with that folder name.

```text
src/common/games/
  games.contracts.ts
  games.admin.base.ts
  games.admin.register.ts
  games.display.base.ts
  games.display.register.ts
  games.presenter.base.ts
  games.presenter.register.ts
  <game-name>/
    <game-name>.contracts.ts
    <game-name>.admin.definition.ts
    <game-name>.admin.manager.ts
    <game-name>.admin.mvc.ts
    <game-name>.display.view.ts
    <game-name>.presenter.view.ts
```

## Naming conventions

- Use a lowercase, kebab-free identifier for the game folder and the `kind` discriminator.
- Keep the same `kind` value across the definition, state snapshot, registries, and parsers.
- Use the same base name for all files in the game folder so the implementation stays easy to discover.
- Keep serializable data shapes in `*.contracts.ts` files and keep UI behavior out of those contracts.
- Prefer descriptive suffixes for responsibility:
  - `*.admin.definition.ts` for parsing and building the game definition.
  - `*.admin.manager.ts` for orchestration and runtime control.
  - `*.admin.mvc.ts` for admin-facing rendering and interaction.
  - `*.display.view.ts` for the public display chooser and page rendering.
  - `*.presenter.view.ts` for the presenter-side state panel.

## Intended usage

The shared files in this folder are meant to keep each game implementation consistent:

- `games.contracts.ts` defines the minimal shape shared by every game.
- `games.admin.base.ts` contains the runtime layering used by the admin flow: game definition, model, controller, view, and manager.
- `games.display.base.ts` contains the display-side chooser abstraction.
- `games.presenter.base.ts` contains the presenter-side state renderer abstraction.
- The `*.register.ts` files map a `kind` value to the concrete implementation.

New game code should live in its own subfolder and avoid leaking game-specific logic into the shared base files.

## Step-by-step: adding a new game

### 1. Define the game identity

Pick a stable `kind` string first. This string is the lookup key used by all registries and must stay consistent everywhere.

Use it in three places:

- the game definition data
- the persisted game state snapshot
- the registry entries that instantiate the implementation

Keep the `kind` value small, lowercase, and unlikely to change later.

### 2. Create the serialized contracts

Add a `*.contracts.ts` file in the game folder and define the serializable data shape for the game.

Use this file for:

- configuration fields parsed from quiz definition content
- runtime snapshot fields that can be safely stored in the database
- type guards or small validation helpers if the game needs them

Keep these contracts JSON-friendly. Anything persisted to the database should be serializable without functions, class instances, or `undefined` values.

### 3. Add the admin definition parser

Add `*.admin.definition.ts` to parse the game definition from markdown and from persisted JSON.

This parser should:

- read the game section from the quiz definition file
- validate required fields
- normalize defaults in one place
- return the concrete game definition object used by the rest of the app

The parser should be strict enough to reject invalid input early, but it should avoid embedding runtime or DOM concerns.

### 4. Add the admin runtime classes

Add the admin-side runtime files for the game:

- `*.admin.manager.ts` for orchestration and lifecycle control
- `*.admin.mvc.ts` for admin-facing rendering and interaction

These files should own the game flow once the definition has already been parsed. They are the right place for game-specific state transitions, timeline rendering, and UI actions driven by the host.

Keep the admin runtime focused on behavior, not on parsing text or shaping raw data.

### 5. Add the display implementation

Add `*.display.view.ts` to render the audience-facing view for the game.

The display layer should:

- consume the persisted runtime snapshot
- decide which page or view should be shown
- avoid depending on admin-only orchestration details

This layer is intentionally narrow. Its job is to translate the live game state into display output, not to run the game itself.

### 6. Add the presenter implementation

Add `*.presenter.view.ts` to render the presenter-side panel for the game.

The presenter layer should:

- consume the same stable game definition data used elsewhere
- decode the runtime snapshot before reading game-specific fields
- respect the secret-visibility flag when showing sensitive values

Use this layer for operational visibility, not for controlling game progression.

### 7. Register the game everywhere it is discovered

After the files exist, wire the new `kind` into each registry:

- `games.admin.register.ts` for definition parsing, manager creation, and admin view creation
- `games.display.register.ts` for display page selection
- `games.presenter.register.ts` for presenter state rendering

Every registry should use the same `kind` value. If one registry is missing, the game may parse correctly but fail later when a different surface tries to render it.

### 8. Add or update quiz-definition documentation if needed

If the new game introduces a new markdown section format, document that format alongside the game implementation and update the quiz-definition guide in the repository root.

Keep the format documentation close to the parser behavior so it stays accurate.

### 9. Validate the wiring

Check the full path from definition to runtime:

- parse the game definition from markdown
- restore the same game definition from JSON
- instantiate the admin manager and views
- instantiate the display chooser
- instantiate the presenter renderer

If any factory still throws an unknown-kind error, the game is not fully registered yet.

## Practical rules to follow

- Keep shared code generic and game code local.
- Keep all persisted shapes serializable.
- Keep `kind` stable once it is chosen.
- Keep naming consistent so files are easy to find.
- Keep parser logic separate from runtime orchestration.
- Keep display and presenter code independent from admin-only state transitions.

## Example mental model

Think of a new game as three layers built on top of the same definition:

- a parser that turns authoring text into structured data
- a runtime that uses that structured data to run the game
- one or more renderers that present the game state on different screens

That separation is what makes games reusable across the admin, user, display, and presenter surfaces.