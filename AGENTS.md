# Project Working Guide

## Focus Areas
- Main request domains are map, sidebar, server, and editor.
- `front/` contains map and sidebar implementation.
- `back/editor/` contains editor implementation.
- `back/server/` contains API/server implementation.
- `back/shared/` contains shared code/spec used by both front and back.

## Directory Notes
- `front/src/components/map/` and `front/src/scripts/map*.js`: map UI and map behaviors.
- `front/src/components/sidebar/` and `front/src/scripts/sideBarUtils.js`: sidebar UI and related logic.
- `back/server/server.js`: backend entrypoint.
- `back/server/scripts/`: server helpers/config.
- `back/server/data/buildings.geojson`, `back/server/data/rooms.json`: core map/building/room data.
- `back/editor/editor.html`, `back/editor/editorMain.js`: editor entry files.
- `back/map/`: built frontend output target. Ignore by default unless user explicitly requests build/deploy output handling.

## Edit Rules
- Do not edit `.gitignore` unless user explicitly asks.
- Do not edit files/directories listed in `.gitignore` unless user explicitly asks.
- Prefer edits in source directories (`front/`, `back/editor/`, `back/server/`, `back/shared/`) over generated/build artifacts.

## Practical Workflow
- For map/sidebar requests: inspect `front/src/components/*` first, then `front/src/scripts/*`.
- For editor requests: start from `back/editor/editorMain.js` and `back/editor/editor.html`.
- For server requests: start from `back/server/server.js`, then `back/server/scripts/*` and `back/server/data/*`.
- If a change affects both front and back contracts, update `back/shared/*` first and align both sides.

## AGENTS.md Maintenance Rules
- Treat this file as a living guide. During work, suggest additions when discovering useful structure or conventions not documented here.
- If directory structure, entrypoints, or data contract locations change, update this file in the same task.
- Keep updates concise and practical (focus on where to edit, where not to edit, and what to check first).
- When uncertain whether a detail is stable, propose it first and only document after confirmation from user or repeated usage.
