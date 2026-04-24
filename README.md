# Tree Emporium's Modpack Planner

A shared Minecraft modpack planning board built with Next.js, React, Prisma, PostgreSQL, and WebSockets.

It is designed for one shared modpack that everyone sees at the same time: add mods, organize them into categories, manage a custom status legend, and watch changes sync live across every open client without refreshing.

> Built as a cleaner replacement for tracking modpacks in Google Sheets.

![Status](https://img.shields.io/badge/status-in%20development-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Planning and Organization
- **Single shared modpack board** with no accounts or rooms
- **Custom categories** with editable names, icons, and header colors
- **Custom statuses** with editable keys, labels, background colors, and text colors
- **One primary status per mod** for quick board scanning
- **Drag-and-drop mod reordering** within a category or into another category column
- **Manual mod entry** for anything not added through search

### Mod Search
- **Modrinth search** through a server-side API route
- **Version and loader filtering** in the search modal
- **Centralized Minecraft version list** from `1.12` through `26.1.2`
- **CurseForge tab placeholder** in the UI with API-key guidance, but no live CurseForge search yet

### Pack Metadata
- **Editable pack name** directly in the header
- **Minecraft version dropdown** that saves immediately on change
- **Loader dropdown** for `Fabric`, `Forge`, `NeoForge`, and `Quilt`
- **Default pack target** set to `Minecraft 26.1.2`

### Realtime Collaboration
- **Automatic save** for pack metadata and all CRUD changes
- **Realtime sync for all connected users** via WebSockets
- **No manual refresh needed** after mod, status, category, reorder, or pack changes
- **Last write wins** conflict behavior

### UI
- **Pastel green visual direction** with soft, readable surfaces
- **Responsive layout** for desktop and mobile
- **Settings modal** for managing statuses and categories
- **Live color preview** while editing legend and category styles

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.4 (App Router) |
| Runtime | Custom Node server (`server.mjs`) hosting Next.js and `/ws` |
| UI | React 19.2.4 + CSS Modules |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Realtime | `ws` WebSocket server |
| Search | Modrinth API proxy route |

---

## Requirements

- Node.js `20.9.0` or newer
- PostgreSQL `14+`

`next@16.2.4` requires Node `>=20.9.0`.

---

## Getting Started

### 1. Install dependencies

```bash
git clone themarneilx/Minecraft-modpack-planner
cd Minecraft-modpack-planner
npm install
```

### 2. Configure the database

Create a PostgreSQL database, then add a `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/modpack"
```

### 3. Push the schema and generate Prisma Client

```bash
npx prisma db push
npx prisma generate
```

### 4. Seed starter data

```bash
npx tsx prisma/seed.ts
```

This seeds:
- a default pack
- starter statuses
- starter categories
- sample mods

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

`npm run dev` starts the custom Node server, not plain `next dev`. That server hosts both the Next.js app and the WebSocket endpoint used for live sync.

### Production

```bash
npm run build
npm start
```

---

## How Realtime Sync Works

- All writes still go through the existing REST API routes.
- After a successful mutation, the server broadcasts `app-data-updated` over `/ws`.
- Connected clients refetch `/api/data` and update in place.
- The current scope is one shared modpack for everyone.

---

## Project Structure

```text
modpack-maker/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── server.mjs                     # Custom Node server + WebSocket host
├── prisma.config.ts               # Prisma 7 CLI config
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── data/route.ts
│   │   │   ├── pack/route.ts
│   │   │   ├── statuses/route.ts
│   │   │   ├── statuses/[id]/route.ts
│   │   │   ├── categories/route.ts
│   │   │   ├── categories/[id]/route.ts
│   │   │   ├── mods/route.ts
│   │   │   ├── mods/[id]/route.ts
│   │   │   ├── mods/reorder/route.ts
│   │   │   └── search/modrinth/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Main shared board + websocket client
│   │   └── page.module.css
│   ├── components/
│   │   ├── CategoryCard/
│   │   ├── Header/
│   │   ├── Legend/
│   │   ├── SearchModal/
│   │   ├── SettingsModal/
│   │   └── StatusPicker/
│   ├── lib/
│   │   ├── data.ts
│   │   ├── minecraft.ts           # Shared Minecraft version options
│   │   ├── mod-list.ts            # Client-side mod insertion helper
│   │   ├── prisma.ts
│   │   └── reorder.ts             # Drag-and-drop reorder helper
│   └── server/
│       └── realtime.ts            # Broadcast helper used by route handlers
├── package.json
└── README.md
```

---

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/data` | Fetch pack info, statuses, categories, and mods |
| GET | `/api/pack` | Fetch pack metadata |
| PUT | `/api/pack` | Update pack name, version, or loader |
| GET | `/api/statuses` | List statuses |
| POST | `/api/statuses` | Create a status |
| PUT | `/api/statuses/:id` | Update a status |
| DELETE | `/api/statuses/:id` | Delete a status |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Delete a category |
| POST | `/api/mods` | Create a mod |
| PUT | `/api/mods/:id` | Update a mod |
| DELETE | `/api/mods/:id` | Delete a mod |
| PATCH | `/api/mods/reorder` | Move or reorder mods across categories |
| GET | `/api/search/modrinth` | Search Modrinth |

All mutating routes broadcast a realtime invalidation event after successful writes.

### Mod Reorder Payload

`PATCH /api/mods/reorder` accepts the affected category order after a drag-and-drop move:

```json
{
  "categories": [
    { "categoryId": 1, "modIds": [10, 11, 12] },
    { "categoryId": 2, "modIds": [20, 13, 21] }
  ]
}
```

The route updates each listed mod's `categoryId` and `sortOrder` in one transaction, then broadcasts the realtime sync event.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `PrismaClientInitializationError` | Check `DATABASE_URL` and confirm PostgreSQL is running |
| `Cannot find module '@prisma/client'` | Run `npx prisma generate` |
| Missing tables | Run `npx prisma db push` |
| Empty board after setup | Run `npx tsx prisma/seed.ts` |
| Realtime sync not working | Start the app with `npm run dev` or `npm start`, not plain `next dev` or `next start` |

---

## Verification

Useful local checks:

```bash
node --import tsx --test src/lib/mod-list.test.ts
node --import tsx --test src/lib/reorder.test.ts
npx tsc --noEmit
npm run build
```

There is currently no `npm test` script in `package.json`; the focused helper tests above are run directly with Node's test runner.

---

## Roadmap

- [x] Category-based mod organization
- [x] Custom status legend with editable colors
- [x] PostgreSQL persistence with Prisma
- [x] Modrinth search via API proxy
- [x] Manual mod entry
- [x] Editable pack name
- [x] Minecraft version and loader dropdowns with autosave
- [x] Shared realtime sync over WebSockets
- [x] Drag-and-drop mod reordering
- [x] Responsive layout
- [ ] Live CurseForge integration
- [ ] Multiple indicators or multi-status support per mod
- [ ] Export modpack as `.txt` or `.json`
- [ ] Multi-pack rooms instead of one global board

---

## Contributing

This project was built for Tree Emporium's modpack planning workflow, but contributions are still welcome.

1. Fork the repo
2. Create a branch
3. Make your changes
4. Open a pull request

---

## License

MIT License -- do whatever you want with it.

---

<p align="center">
  Built for shared Minecraft modpack planning<br>
  <em>Because Google Sheets wasn't built for this either.</em>
</p>
