```
  ██████╗ █████╗ ██████╗  █████╗ ███╗   ███╗███████╗██╗
 ██╔════╝██╔══██╗██╔══██╗██╔══██╝████╗ ████║██╔════╝██║
 ██║     ███████║██████╔╝███████║██╔████╔██║█████╗  ██║
 ██║     ██╔══██║██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ██║
 ╚██████╗██║  ██║██║  ██║██║  ██║██║ ╚═╝ ██║███████╗███████╗
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝
```

> *make it simple — make it perfect.*

---

## Overview

Caramel is a modular Discord bot built with [Sapphire Framework](https://sapphirejs.dev/) and TypeScript. Designed from the ground up with clean architecture, async job processing, and a two-layer caching system — built to scale.

---

## Features

- **Vanity Tracker** — Detects custom status keywords and automatically assigns/removes roles. Jobs processed asynchronously via BullMQ.
- **Moderation** — Full suite: warn, mute, ban, softban, kick, timeout, unmute, slowmode, lockdown, history. Supports both slash commands and message prefix.
- **Silent Ban** — Silently restricts users from sending messages or joining voice without notifying them. Rate-limit escalation with progressive timeouts.
- **Auto-Mute Restore** — Reapplies active mutes on rejoin, with automatic expiry via background worker.
- **Module System** — Each feature is an independent module. Enable, disable, configure, or factory reset per guild without affecting others.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Sapphire Framework |
| Database | PostgreSQL via Sequelize |
| Cache | Redis (ioredis) |
| Queue | BullMQ |
| Logger | Winston |

---

## Architecture

```
src/
├── commands/         # Slash + prefix commands, grouped by module
│   ├── config/       # Module management (setup, enable, disable, reset)
│   └── mod/          # Moderation commands
├── database/
│   ├── models/       # Sequelize models (GuildConfig, ModLog, SilentBan, ...)
│   ├── CacheManager  # Redis sync layer
│   ├── Redis         # ioredis setup + container attachment
│   └── db            # Sequelize init + connection
├── lib/
│   ├── constants/    # Shared constants (emojis)
│   └── utils/        # Layouts, mod utils, vanity logic, queues, rate limiting
├── listeners/        # Discord event handlers
├── services/         # Business logic (SilentBanService)
├── structures/       # CaramelClient (custom Sapphire client)
├── validators/       # Module pre-enable validation
├── workers/          # Background workers (Vanity, SilentBan, Mute)
└── index             # Bootstrap
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Installation

```bash
git clone https://github.com/youruser/caramel
cd caramel
npm install
```

### Environment

Create a `.env` file based on `.env.example`:

```env
DISCORD_TOKEN=
DATABASE_URL=
REDIS_URL=
PREFIX=c!
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## Module Setup

Caramel uses a module system. Each feature must be configured and enabled per guild:

```
/module setup name:Vanity Tracker
/module setup name:Moderation
/module enable name:Vanity Tracker
/module settings name:Moderation
/module reset name:Moderation
```

---

## Commands

### Moderation — `/mod` or `c!mod`

| Command | Description |
|---|---|
| `warn` | Warn a member |
| `mute` | Mute with role (supports duration) |
| `timeout` | Discord native timeout |
| `unmute` | Remove timeout or mute |
| `ban` | Ban a member |
| `softban` | Ban + unban to clear messages |
| `kick` | Kick a member |
| `silentban` | Add / remove / list silent bans |
| `slowmode` | Set channel slowmode |
| `lockdown` | Toggle channel lockdown |
| `history` | View sanction history |

### Config — `/module`

| Command | Description |
|---|---|
| `setup` | Interactive module setup via modal |
| `settings` | View current configuration |
| `enable` | Enable a module |
| `disable` | Disable a module |
| `reset` | Factory reset a module |

---

## License

MIT © Caramel