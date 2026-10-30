# Step-by-step guide

From an old tablet and a Home Assistant OS box to a panel that is always on and a Telegram group that edits the lists. Every command is shown for **macOS** and **Windows** (Linux works like macOS).

> Names of Home Assistant menus are from the 2026 releases, where add-ons are called **Apps**. If your version shows "Add-ons", it is the same place.

- [0. What you need](#0-what-you-need)
- [1. Get the project and try the demo](#1-get-the-project-and-try-the-demo)
- [2. Prepare Home Assistant](#2-prepare-home-assistant)
- [3. Configure the panel](#3-configure-the-panel)
- [4. Install the server inside Home Assistant](#4-install-the-server-inside-home-assistant)
- [5. Give Home Assistant a fixed address](#5-give-home-assistant-a-fixed-address)
- [6. Prepare the tablet](#6-prepare-the-tablet)
- [7. Telegram: shopping, tasks, /menu](#7-telegram-shopping-tasks-menu)
- [8. Your menu](#8-your-menu)
- [9. Use it away from home (Tailscale)](#9-use-it-away-from-home-tailscale)
- [10. Updating and everyday commands](#10-updating-and-everyday-commands)

## 0. What you need

| | Notes |
|---|---|
| An old tablet or phone | Anything with a browser. Tested on a 2014 tablet with Android 4.4 and Chrome 40. A USB cable that carries **data** (not only charge). |
| Home Assistant OS | On a Raspberry Pi or any small computer, on the same network. |
| A computer | macOS or Windows, only for the setup. Afterwards it can stay off. |
| Python 3.9 or newer | macOS: `python3 --version` in Terminal (install the Command Line Tools if asked). Windows: install from python.org and tick **Add python.exe to PATH**. |
| Telegram (optional) | For the shopping and task commands. |

## 1. Get the project and try the demo

macOS (Terminal):

```bash
git clone https://github.com/lapencadev/old-tablet-dashboard.git
cd old-tablet-dashboard
python3 -m pip install -r requirements.txt
python3 tools/panel.py demo
```

Windows (PowerShell):

```powershell
git clone https://github.com/lapencadev/old-tablet-dashboard.git
cd old-tablet-dashboard
python -m pip install -r requirements.txt
python tools\panel.py demo
```

No git? Download the ZIP from GitHub (**Code → Download ZIP**) and unzip it.

Open <http://localhost:8000>: you see the panel with a fake Home Assistant. `--lang es` shows it in Spanish. Stop it with Ctrl+C.

From here on the guide writes `python tools/panel.py`; on macOS type `python3`, on Windows you can type `tools\panel.py` with a backslash.

## 2. Prepare Home Assistant

### 2.1 A long-lived token

1. In Home Assistant click your name (bottom left) → **Security** tab.
2. **Long-lived access tokens → Create token**, name it "panel", copy it (it is shown only once).

### 2.2 The `.env` file

Copy `.env.example` to `.env` (macOS: `cp .env.example .env`; Windows: `copy .env.example .env`) and edit:

```ini
HA_URL=http://<HA_IP>:8123
HA_TOKEN=<the token>
```

The **`:8123` port is required**. To find the address: **Settings → System → Network**, or your router's device list.

Check it:

```bash
python tools/panel.py ha-check
```

It lists your calendars, to-do lists, weather entities and helpers. If it says 401, the token is wrong; if it cannot connect, check the address and the port.

### 2.3 Calendars

Google Calendar without Google Cloud credentials:

1. In Google Calendar on a computer: **Settings → (your calendar) → Integrate calendar → Secret address in iCal format**. Copy it.
2. In Home Assistant: **Settings → Devices & services → Add integration → Remote Calendar**, paste the address, give it a name.
3. Repeat for every calendar you want on the panel. The first one in `MAIN_CALENDAR` shows without a label; the others get a small chip.

Remote Calendar downloads the calendars once a day. Step 7 installs an automation that refreshes them every 15 minutes (you can install only that one: `python tools/panel.py deploy-ha --only calendar`).

### 2.4 To-do lists

**Settings → Devices & services → Add integration → Local To-do**, create one list called *Shopping* and another called *Tasks*. Their entities will be `todo.shopping` and `todo.tasks` (run `ha-check` to confirm).

### 2.5 Alerts (optional)

Banners such as "the washing machine is done" come from `input_boolean` helpers that your automations turn on: **Settings → Devices & services → Helpers → Create helper → Toggle**. Date reminders use a **Date** or **Date and time** helper.

## 3. Configure the panel

Copy `panel/config.example.js` to `panel/config.js` and edit it. The file explains each option:

- `LANG`: `'en'` or `'es'`.
- `CALENDARS` (`'auto'` = all), `MAIN_CALENDAR`, `TASKS`, `SHOPPING`, `WEATHER`.
- `ALERTS` and `DATE_ALERTS`: your helpers and the text to show.
- `CHECKLIST`: daily chips with a time window.
- `PHOTOS`: put images in `panel/img/` and list them. They are git-ignored, so your photos stay private.

Try it against your real Home Assistant before installing anything:

```bash
python tools/panel.py serve
```

Open <http://localhost:8000>.

## 4. Install the server inside Home Assistant

So the panel keeps working with the computer off, the server runs as a **local app** inside Home Assistant OS.

### 4.1 SSH access

1. **Settings → Apps → Install app** (the app store button) → search **Terminal & SSH** → Install.
2. Create an SSH key on your computer if you do not have one:
   - macOS: `ssh-keygen -t ed25519` (press Enter to accept the defaults), then `cat ~/.ssh/id_ed25519.pub`.
   - Windows (PowerShell): `ssh-keygen -t ed25519`, then `type $env:USERPROFILE\.ssh\id_ed25519.pub`. If `ssh` is missing: **Settings → Apps → Optional features → OpenSSH Client**.
3. In the Terminal & SSH app → **Configuration**: paste the public key in `authorized_keys`, and in **Network** set port 22. Save and start the app.
4. Test: `ssh root@<HA_IP>`. You should get the Home Assistant prompt.

Add to `.env`:

```ini
HA_SSH=root@<HA_IP>
```

(If your key is not the default one, add `HA_SSH_KEY=~/.ssh/your_key`.)

### 4.2 Install

```bash
python tools/panel.py deploy-app
```

It uploads the app to `/local_apps/tablet_panel`, installs it and starts it. The first build takes a few minutes on a Raspberry Pi. Run the same command again after every change: it detects it as an update.

Open `http://<HA_IP>:8000` from any device on your network.

### 4.3 App options

**Settings → Apps → Old Tablet Dashboard → Configuration**:

| Option | |
|---|---|
| `lang` | Language of the Telegram bot. |
| `menu_url`, `menu_adapter`, `menu_people`, `menu_password`, `recipes_url` | Menu sync (step 8). Empty = use the menu file deployed with the app. |
| `telegram_chat_id` | Group id for `/menu` and `/help` (step 7). |
| `allowed_hosts` | Only if you open the panel with your own domain name (not an IP, `homeassistant.local` or a Tailscale name): add it here, comma separated. |

The **Log** tab shows what the server is doing (menu sync, Telegram connection, Home Assistant errors).

## 5. Give Home Assistant a fixed address

The tablet opens `http://<HA_IP>:8000`, so that address must not change. In your router, find **DHCP / static leases / address reservation** (often under an advanced menu) and reserve the current address for the Home Assistant device. Save, and if the router has a separate "save configuration" step, do it too.

## 6. Prepare the tablet

### 6.1 USB debugging

1. **Settings → About tablet** → tap **Build number** seven times until it says you are a developer.
2. **Settings → Developer options** → enable **USB debugging** and **Stay awake** (screen on while charging).

### 6.2 adb on your computer

- macOS: `brew install android-platform-tools` (or download *SDK Platform-Tools* from developer.android.com).
- Windows: download *SDK Platform-Tools for Windows*, unzip it (for example in `C:\platform-tools`) and add that folder to the PATH (**Edit the system environment variables → Environment Variables → Path → New**).

Connect the tablet, accept the "Allow USB debugging" prompt on its screen, and check:

```bash
adb devices
```

Empty list? Try another cable (many only charge) and switch the tablet's USB mode to **PTP** (camera).

### 6.3 Wi-Fi and the panel

- Old tablets often only see **2.4 GHz** networks. If your network does not appear, connect to the 2.4 GHz one.
- Open the panel: `python tools/panel.py tablet-open http://<HA_IP>:8000`, or type the address in the browser.
- Browser menu → **Add to home screen**: it opens full screen. There is no reload button there: **tap the clock** to reload.

### 6.4 Clean up the tablet (optional)

```bash
python tools/panel.py tablet-debloat --dry-run   # see what it would do
python tools/panel.py tablet-debloat
```

It disables (does not delete) the apps in `config/debloat.txt`; edit the list for your device. `--restore` brings them back. On Android 4.4 system apps cannot be disabled over adb, so it hides them with `pm block`.

Screenshot of the tablet: `python tools/panel.py tablet-shot` (saved to your Desktop).

## 7. Telegram: shopping, tasks, /menu

### 7.1 The bot

1. In Telegram, talk to **@BotFather** → `/newbot`, choose a name and a username, copy the **token**.
2. `/setprivacy` → choose the bot → **Disable**. Without this the bot does not see messages like `+ milk` in groups. If the bot was already in the group, remove it and add it again.
3. Create a group with your household and add the bot.

### 7.2 The Telegram integration in Home Assistant

1. **Settings → Devices & services → Add integration → Telegram bot**, platform **Polling**, paste the bot token.
2. Find the group id: send a message in the group, then in **Developer tools → Events** listen to `telegram_text` and look at `chat_id` (a negative number starting with `-100`).
3. Allow that chat in the integration (option *allowed chat IDs* or *Add chat*, depending on the version).

### 7.3 Install the commands

Add to `.env`:

```ini
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
PANEL_LANG=en
HA_SHOPPING=todo.shopping
HA_TASKS=todo.tasks
```

```bash
python tools/panel.py deploy-ha --dry-run   # list what will be created
python tools/panel.py deploy-ha
```

This creates the automations and scripts (all their ids start with `otd_`). For `/menu` and `/help`, also set `telegram_chat_id` in the app options (step 4.3) and restart the app.

### 7.4 Suggestions when typing "/"

@BotFather → `/setcommands` → choose the bot → send all the lines in one message (it replaces the whole list, so include any commands your bot already had):

```text
shopping - Show the shopping list
tasks - Show pending tasks
menu - Suggest the shopping for this week's menu
help - All the commands and how to use them
```

(In Spanish the commands are `compra`, `tareas`, `menu` and `ayuda`.)

### 7.5 Use

| Write in the group | What happens |
|---|---|
| `+ milk, eggs and bread` | Added, sorted by supermarket section; repeated items are reported |
| `- eggs` | Removed |
| `/shopping` | The list by section, with a button per product to tick it off |
| `! call the plumber @friday` | Task with a due date: `@today`, `@tomorrow`, a weekday, or `@15/11` |
| `/tasks` | Pending tasks by date, with buttons to mark them done |
| `/menu` | This week's shopping suggestions as checkboxes → **Add** |
| `/help` | Every command with an example |

Supermarket sections and command names are in `config/ha.en.json` / `config/ha.es.json`: edit them and run `deploy-ha` again.

## 8. Your menu

The panel reads `panel/data/menu.js`. Start from `panel/data/menu.example.js`; the format is described in [domain-model.md](domain-model.md):

- `people`: who eats (the first one is the default; others appear only when their dish differs).
- `meals`: id, label, the hour each meal is over (`until`) and whether "Tomorrow" shows it.
- `weeks`: seven days each, with `start` (a Monday) and `repeat` (2 = the same plan for two weeks).
- `shopping`: products per week for `/menu`. A line may hold several products separated by commas.
- Put the main dish in `<strong>`: that is what the panel shows; the rest appears when you tap the meal.

Check it with `python tools/panel.py validate-menu`, then `deploy-app`.

**Recipes**: `panel/data/recipes.json` (same shape as `recipes.example.json`). Tapping a meal shows the recipe whose title best matches the main dish.

**Syncing from a website**: set `menu_url` (and `menu_adapter`) in the app options. `generic` downloads a file already in this format; `static-site` reads a meal-planning website made of static files, even with a password-protected part (`menu_password`). Both formats, with examples, are in [menu-sources.md](menu-sources.md).

**Choosing a week by hand**: tap the week name next to "Today". The choice is shared by every screen and by `/menu`; pick *Automatic* to go back to dates. A new week appears on the day it starts.

## 9. Use it away from home (Tailscale)

1. **Settings → Apps → Install app → Tailscale** → install, start, open the web UI and log in.
2. Install Tailscale on your phone with the same account.
3. In the Home Assistant Companion app, add the Tailscale address **with the port**: `http://<tailscale-name-or-100.x.y.z>:8123`. The panel is at the same address with `:8000`.

To share with someone else without sharing your account: in the Tailscale admin console, **Users → Invite**, or share just the Home Assistant machine.

## 10. Updating and everyday commands

```bash
git pull
python tools/panel.py deploy-app
```

| Task | Command |
|---|---|
| Check everything still passes | `python tools/panel.py check` |
| A screenshot of the tablet | `python tools/panel.py tablet-shot` |
| Reinstall the Telegram commands after editing texts | `python tools/panel.py deploy-ha` |
| See which entities exist | `python tools/panel.py ha-check` |

Problems: [troubleshooting.md](troubleshooting.md).
