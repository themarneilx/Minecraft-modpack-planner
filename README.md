# ModCraft -- Collaborative Minecraft Modpack Builder

A collaborative web app for planning Minecraft modpacks with friends. Search mods from Modrinth, organize by category, track mod status with custom color-coded legends, and save everything to PostgreSQL -- no accounts needed.

> Built as a better alternative to messy Google Sheets modpack planning.

![Status](https://img.shields.io/badge/status-in%20development-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Core
- **Custom Categories** -- Add, edit, rename, and color-code your own mod categories (columns)
- **Custom Statuses** -- Create your own status legend with custom labels and colors (both background and text)
- **PostgreSQL Persistence** -- All data saved to a database using Prisma ORM, no more localStorage
- **Inline Editing** -- Click to edit the modpack name, Minecraft version, and mod loader directly in the UI
- **Mod Management** -- Add, remove, and change status of individual mods per category
- **Modrinth Search** -- Search mods from Modrinth API with version and loader filters
- **CurseForge Ready** -- CurseForge search tab included (requires API key)

### UI
- **Pastel Color Palette** -- Soft, readable colors for both statuses and category headers
- **Color Picker** -- Full hex color picker in the Settings modal for status and category customization
- **Live Preview** -- See your color/label changes before saving
- **Responsive Layout** -- Works on desktop and mobile
- **Settings Modal** -- Manage statuses and categories from a single tabbed modal

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running locally or remotely)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/modpack-maker.git
cd modpack-maker
npm install
```

### 2. PostgreSQL Database Setup

Make sure PostgreSQL is running, then create a database and user:

```bash
# Connect to PostgreSQL as superuser
psql -U postgres
```

```sql
-- Create the database
CREATE DATABASE modpack;

-- Create a dedicated user (change password as needed)
CREATE USER marneilx WITH PASSWORD 'your_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE modpack TO marneilx;
ALTER DATABASE modpack OWNER TO marneilx;
```

### 3. Configure Environment

Create a `.env` file in the project root (or edit the existing one):

```env
DATABASE_URL="postgresql://marneilx:your_password_here@localhost:5432/modpack"
```

### 4. Prisma Setup

This project uses **Prisma 7** with a driver adapter (`@prisma/adapter-pg`). The configuration lives in two places:

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (models, relations) |
| `prisma.config.ts` | CLI config (connection URL for migrations/push) |
| `src/lib/prisma.ts` | Runtime client singleton (uses `PrismaPg` adapter) |

Push the schema to the database:

```bash
npx prisma db push
```

Generate the Prisma Client:

```bash
npx prisma generate
```

### 5. Seed Initial Data

The seed script populates default statuses (11 color-coded), categories (9 columns), and sample mods:

```bash
npx tsx prisma/seed.ts
```

You can re-run this anytime to reset the database to its default state.

### 6. Run the Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

### Common Issues

| Problem | Fix |
|---------|-----|
| `PrismaClientInitializationError` | Check your `DATABASE_URL` in `.env` matches your PostgreSQL credentials |
| `Cannot find module '@prisma/client'` | Run `npx prisma generate` |
| `relation "statuses" does not exist` | Run `npx prisma db push` to create the tables |
| Empty page (no categories) | Run `npx tsx prisma/seed.ts` to populate initial data |

---

## Project Structure

```
modpack-maker/
├── prisma/
│   ├── schema.prisma           # Database schema (PackInfo, Status, Category, Mod)
│   └── seed.ts                 # Seed script for initial data
├── prisma.config.ts            # Prisma 7 CLI configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── data/route.ts           # GET all data (statuses + categories + mods + pack info)
│   │   │   ├── pack/route.ts           # GET/PUT pack info (name, version, loader)
│   │   │   ├── statuses/route.ts       # GET/POST statuses
│   │   │   ├── statuses/[id]/route.ts  # PUT/DELETE individual status
│   │   │   ├── categories/route.ts     # GET/POST categories
│   │   │   ├── categories/[id]/route.ts# PUT/DELETE individual category
│   │   │   ├── mods/route.ts           # POST new mod
│   │   │   ├── mods/[id]/route.ts      # PUT/DELETE individual mod
│   │   │   └── search/modrinth/route.ts# Modrinth API proxy
│   │   ├── globals.css                 # Design tokens and global styles
│   │   ├── layout.tsx                  # Root layout with fonts
│   │   ├── page.tsx                    # Main page (state orchestrator)
│   │   └── page.module.css             # Page-level styles
│   ├── components/
│   │   ├── CategoryCard/               # Mod category card with mod list
│   │   ├── Header/                     # App header with legend toggle
│   │   ├── Legend/                      # Collapsible status legend panel
│   │   ├── SearchModal/                # Modrinth/CurseForge search modal
│   │   ├── SettingsModal/              # Status and category CRUD with color pickers
│   │   └── StatusPicker/               # Status selection modal
│   └── lib/
│       ├── data.ts                     # TypeScript type definitions
│       └── prisma.ts                   # Prisma client singleton
├── .env                                # Database connection string
├── tsconfig.json
├── package.json
└── README.md
```

---

## Database Schema

```
PackInfo     -- name, mc_version, loader
Status       -- key, label, color, text_color, sort_order
Category     -- name, icon, header_bg, sort_order
Mod          -- name, status_key (FK), category_id (FK), source, url, sort_order
```

- **Status <-> Mod**: One-to-many (a status can be used by many mods)
- **Category <-> Mod**: One-to-many with cascade delete

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Fetch all statuses, categories (with mods), and pack info |
| GET | `/api/pack` | Get pack info |
| PUT | `/api/pack` | Update pack name, version, or loader |
| GET | `/api/statuses` | List all statuses |
| POST | `/api/statuses` | Create a new status |
| PUT | `/api/statuses/:id` | Update a status (label, colors, key) |
| DELETE | `/api/statuses/:id` | Delete a status (fails if mods use it) |
| GET | `/api/categories` | List all categories with mods |
| POST | `/api/categories` | Create a new category |
| PUT | `/api/categories/:id` | Update a category (name, icon, color) |
| DELETE | `/api/categories/:id` | Delete a category (cascades to mods) |
| POST | `/api/mods` | Create a new mod |
| PUT | `/api/mods/:id` | Update a mod (status, name, source, url) |
| DELETE | `/api/mods/:id` | Delete a mod |
| GET | `/api/search/modrinth` | Search Modrinth API (proxy) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL |
| Styling | CSS Modules + CSS Custom Properties |
| Fonts | Inter, JetBrains Mono (via `next/font`) |
| APIs | Modrinth v2 |

---

## Roadmap

- [x] Category-based mod organization
- [x] Color-coded status system
- [x] Modrinth API search (server-side proxy)
- [x] Status picker modal
- [x] PostgreSQL database persistence (Prisma)
- [x] Custom status CRUD with color picker
- [x] Custom category CRUD with color picker
- [x] Inline editable pack name, MC version, and loader
- [x] Responsive design
- [x] TypeScript with strict mode
- [ ] CurseForge API integration (needs key)
- [ ] Real-time collaborative editing (WebSockets)
- [ ] Drag-and-drop mod reordering
- [ ] Export modpack as `.txt` or `.json`
- [ ] Mod dependency auto-detection
- [ ] Deploy to Netlify / Vercel

---

## Contributing

This is a personal project for me and my friends, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/cool-thing`)
3. Commit your changes (`git commit -m 'Add cool thing'`)
4. Push to the branch (`git push origin feature/cool-thing`)
5. Open a Pull Request

---

## License

MIT License -- do whatever you want with it.

---

<p align="center">
  Made for Minecraft modpack planning<br>
  <em>Because Google Sheets wasn't built for this.</em>
</p>
