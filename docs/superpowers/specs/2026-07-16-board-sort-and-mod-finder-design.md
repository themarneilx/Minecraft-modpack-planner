# Board Sorting and Mod Finder Design

## Goal

Add explicit, persisted alphabetical sorting for category cards and category mod lists. Add a board-wide finder beside Settings that searches mods already present on the shared board, reveals hidden matches, and scrolls directly to the selected mod. Also allow the custom server port to be configured from root `.env` files and document all three capabilities in `README.md`.

## User Experience

The pack action area will contain a compact mod search field, a Sort menu, and the existing Settings button.

The Sort menu will provide three actions:

- Categories A-Z
- Mods A-Z in every category
- Everything A-Z

Sorting is explicit rather than permanent. A user can sort alphabetically and then continue using drag-and-drop to create a custom order. Selecting a sort action updates the board immediately, shows the existing syncing state, persists the resulting order, and broadcasts the update to connected users.

The mod finder searches mod names case-insensitively as the user types. Results display the mod name and category name so duplicate mod names remain distinguishable. Results are ordered by mod name and then category name. The dropdown supports pointer selection, Arrow Up, Arrow Down, Enter, Escape, and an empty-results message.

Selecting a result closes the dropdown, expands the category when the match is outside its first ten visible mods, scrolls the matching row to the center of the viewport with smooth behavior, and briefly highlights the row. Search does not query Modrinth or CurseForge and does not mutate board data.

## Architecture

Pure helpers will provide stable alphabetical sorting and board search. Sorting will use a case-insensitive, numeric-aware collator and retain ID order as a deterministic tie-breaker. Helpers will return new category and mod arrays with normalized `sortOrder` values.

The page owns the search query, active result, sort-menu state, and revealed mod ID. `CategoryCard` receives the revealed mod ID. When that ID belongs to the category, the card renders all mods regardless of its local collapsed state and marks the matching row. A page effect waits for that render, calls `scrollIntoView`, and clears the highlight after a short delay.

A dedicated `PATCH /api/sort` route will accept explicit category and mod ID orders produced by the client. It will validate positive unique IDs, update requested category and mod sort positions in one PostgreSQL transaction, and emit one realtime update only after the transaction succeeds. This prevents a combined sort from partially saving categories while failing to save mods.

The client applies sorting optimistically. If persistence fails, it reloads `/api/data` to restore the authoritative database order. Other connected clients receive the normal WebSocket invalidation and refresh automatically.

## Port Configuration

The custom server will load root `.env` files with Next's `@next/env` before reading `PORT`. A process-level `PORT` remains the highest-priority override. Invalid or out-of-range values will fail startup with a clear error instead of silently binding an unexpected port.

`.env.example` will include `PORT=3000`. The README will explain that the reverse proxy upstream must use the same port and show both `.env` and process-level examples.

## Error Handling

- Sorting with no categories or mods is a no-op and does not issue an invalid request.
- The sort API rejects missing, duplicate, non-integer, or unknown IDs.
- A failed sort restores server state through the existing refetch path.
- Search results update immediately when mods are added, removed, renamed, moved, or remotely synchronized because they derive from current `AppData`.
- If a selected result disappears before navigation, the reveal state clears without scrolling.

## Accessibility and Responsive Behavior

The finder uses a labelled combobox/listbox relationship with active-result semantics. Keyboard users can navigate and select results without leaving the input. The Sort control exposes a labelled menu and buttons rather than relying on hover.

On narrow screens, pack actions wrap below metadata. The finder remains usable at full available width and the dropdown stays within the viewport.

Animations respect `prefers-reduced-motion`; scrolling becomes immediate and the highlight does not pulse when reduced motion is requested.

## Testing

- Unit tests cover deterministic category sorting, per-category mod sorting, combined sorting, case-insensitive matching, duplicate-name results, and empty queries.
- Route tests cover sort payload validation independently from the database.
- Server configuration tests cover default, `.env`, process override, and invalid port values.
- Existing unit, typecheck, lint, and production build checks must remain green.
- Browser QA covers search dropdown behavior, keyboard selection, automatic expansion beyond ten mods, scroll/highlight, all three persisted sort actions, responsive layout, and relevant console errors.

## Documentation

`README.md` will add alphabetical board sorting and the added-mod finder to Features, describe the atomic sort persistence path and realtime behavior, document `PORT`, and list the new sort endpoint in the API reference.
