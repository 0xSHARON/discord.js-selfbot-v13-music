# 0xSHARON MUSIC SELFBOT v4

A high-performance, stealth Discord Music Selfbot built with Node.js, `@discordjs/voice`, and `discord.js-selfbot-v13`. Plays high-quality audio in **Guild Voice Channels** and **1-on-1 Direct Message / Group DM calls** with DAVE end-to-end encryption support.

---

## Key Features

- **100% Stealth Silent Mode**: Never sends any messages or replies to Discord text channels or DMs. All feedback and logs are output locally to your terminal console.
- **Direct Message (DM) & Group DM Call Support**: Seamlessly ring and stream music directly into 1-on-1 private calls and group calls (`>call`, `>play`).
- **DAVE E2EE Compatible**: Compatible with Discord's latest Audio/Video End-to-End Encryption protocol using `@discordjs/voice` and `@snazzah/davey`.
- **Dynamic Rich Presence (RPC)**: Automatically updates your Discord user profile activity with real-time "Listening to" status, track title, author, duration timestamps, YouTube album art, and an interactive "Listen on YouTube" button.
- **24/7 Mode (`>247`)**: Keeps the bot connected indefinitely in voice channels or DM calls even after the queue finishes.
- **Auto-Leave on Alone**: Automatically disconnects from voice channels or DM calls if all other users leave, saving bandwidth and mimicking natural human behavior (bypassed if 24/7 mode is enabled).
- **Local Web Dashboard & Remote Controller**: Built-in sleek dark-mode glassmorphic browser controller (`http://localhost:3000`) for visual queue management, play/pause, scrub progress bar, volume slider, YouTube search, and real-time live console feeds.
- **Audio Controls**: Full queue management, pause, resume, skip, looping, volume adjustment, and bassboost audio filter.

---

## Web Dashboard

Access your local web controller anytime while the bot is running:
- **URL**: `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied)
- **Controls**: Real-time play/pause, track skipping, timeline progress tracking, volume slider, 24/7 mode toggle, single-click track removal from queue, and live terminal activity monitoring.

---

## Commands

All commands use your configured prefix (e.g. `>`):

| Command | Aliases | Description |
| :--- | :--- | :--- |
| `>play <query/url>` | `>p` | Searches YouTube and plays audio in the current voice channel or DM call |
| `>call [@user/id]` | `>dmcall`, `>ring` | Initiates a direct message call with a user and joins |
| `>join` | `>j`, `>inf` | Connects to your current voice channel or DM call |
| `>247` | `>24/7`, `>stay` | Toggles 24/7 mode (prevents disconnecting when songs end) |
| `>pause` | - | Pauses the currently playing track |
| `>resume` | `>r` | Resumes playback of a paused track |
| `>skip` | `>s` | Skips the current song to the next in queue |
| `>stop` | `>st` | Stops playback, clears the queue, and disconnects |
| `>volume <1-10>` | `>v` | Adjusts playback volume |
| `>bassboost` | `>bb`, `>bass` | Toggles dynamic bass boost filter |
| `>loop` | `>l` | Toggles single-track loop mode |
| `>queue` | `>q` | Displays current song queue in the terminal |

---

## Installation & Setup

### Prerequisites
- Node.js 18.0.0 or higher
- Windows, macOS, or Linux

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/0xSHARON/discord.js-selfbot-v13-music.git
cd discord.js-selfbot-v13-music
npm install
```

### 2. Configure `.env`
Create a `.env` file in the project root:
```env
# Your Discord user account token
TOKEN=your_user_token_here

# Command prefix (e.g., >, !, $)
PREFIX=>

# Discord user ID(s) authorized to execute commands (leave empty for owner only)
ALLOWED=your_discord_user_id
```

### 3. Run the Bot
```bash
node index.js
```

---

## Author & Credits

- **Creator & Developer**: **0xSHARON**
  - GitHub: [@0xSHARON](https://github.com/0xSHARON)

---

## Disclaimer & Warnings

> **CAUTION**: Automating user accounts (selfbotting) is against Discord's Terms of Service and Community Guidelines. Using selfbots may result in account termination or suspension. Use responsibly and at your own risk.
>
> Official Terms: https://discord.com/terms
