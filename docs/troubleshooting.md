# Troubleshooting

Every problem met while building the original setup (an Android 4.4 tablet, Home Assistant OS on a Raspberry Pi, macOS), with the cause and the fix.

## Tablet

| Symptom | Cause | Fix |
|---|---|---|
| `adb devices` shows nothing | Charge-only cable, or the tablet is in MTP mode | Try another cable; set USB mode to **PTP**; accept the "Allow USB debugging" prompt on the tablet. |
| The home Wi-Fi does not appear | Old tablets only see **2.4 GHz** networks | Connect to the 2.4 GHz network of the router (often a different name from the 5 GHz one). |
| `pm disable-user` → *Permission Denial* | Android 4.4 does not let adb disable system apps | `tablet-debloat` falls back to `pm block` (KitKat only). `--restore` undoes both. |
| The panel looks old after a change | The tablet cached the previous version, and a home-screen shortcut has no reload button | The server sends `Cache-Control: no-store`; **tap the clock** to reload. The panel also reloads every 30 minutes. |
| Blank page or a red "JS error" bar | Modern JavaScript in a file loaded by the panel (usually a hand-edited `config.js` or `menu.js`) | Remove trailing `=>`, `let`, `const`, template strings. `python tools/panel.py validate-menu` checks the menu; `check` runs the ES5 gate on every panel file. |
| The bottom of a column is cut | Real screen height is smaller than expected (browser and navigation bars) | The fit loop trims lists and shrinks text automatically. If something is still cut, take a `tablet-shot` and open an issue with it. |
| HTTPS sites fail on the tablet | Android 4.4 has expired root certificates | Use the panel over plain HTTP on the LAN (that is what it is designed for). |

## Home Assistant

| Symptom | Cause | Fix |
|---|---|---|
| `ha-check` → 401 | Not a long-lived token, or copied with spaces | Create a new one in your profile → **Security**. |
| Cannot connect / "port not reachable" | Missing port | Always use `http://<address>:8123` (and `:8000` for the panel). |
| Google Calendar integration asks for Google Cloud credentials, tokens invalid | The official integration needs OAuth credentials of your own | Use the calendar's **secret iCal address** with the **Remote Calendar** integration. |
| Calendar changes take a day to show | Remote Calendar polls every 24 h | Install the refresh automation: `deploy-ha --only calendar` (every 15 minutes). |
| Google Keep shared list cannot be read | Keep has no official API | Use a Home Assistant to-do list and the Telegram commands. |
| The address of Home Assistant changed (for example `.40` → `.37`) | The router gave it a new DHCP lease | Reserve the address in the router (step 5 of the guide) and save the router configuration. |
| `/api/hassio/...` answers 401 with a user token | Supervisor endpoints are not available to user tokens | Not an error: it does not mean you are on a Docker install. HA OS shows the Supervisor port 4357 and the **Apps** menu. |

## Local app (`deploy-app`)

| Symptom | Cause | Fix |
|---|---|---|
| The app does not appear in the store | HA 2026 reads local apps from **`/local_apps`** (not `/addons`) | `deploy-app` uses `/local_apps/tablet_panel`. Check the folder over SSH. |
| Build fails with odd files `._something` | macOS adds resource-fork files to archives | `deploy-app` builds the archive in Python and skips them. If you copy by hand on macOS, set `COPYFILE_DISABLE=1`. |
| `ha store reload` times out | The store refresh is slow on a Raspberry Pi but keeps going | `deploy-app` retries; run it again if needed. |
| Build error about `BUILD_FROM` | HA OS 2026 no longer passes a default base image | The Dockerfile uses `python:3.12-alpine` directly. |
| "Permission denied" while building | Files copied without read permission for the builder | `deploy-app` sets 0644/0755 in the archive. |
| An "update available" notice that fails | The page shows a version that was already replaced | Reload the Home Assistant page; run `deploy-app` again. |
| Warning about the app not stopping cleanly | The server ignored SIGTERM | Fixed: the server exits with code 0 on SIGTERM. |

## Telegram

| Symptom | Cause | Fix |
|---|---|---|
| `/commands` work but `+ milk` does nothing | Group privacy is on | @BotFather → `/setprivacy` → **Disable**, then remove and re-add the bot to the group. |
| `/menu` does not answer | `telegram_chat_id` not set in the app options, or the app is not running | Set it, restart the app and check the **Log** tab for "Telegram /menu: listening". |
| `/menu` suggests only a few products | Lines with several products were read as one | Fixed: lines are split by commas (names with "and"/"y" stay whole). |
| The menu stops updating and the log says "wrong MENU_PASSWORD" | The site's password changed, or `menu_password` has a typo | Fix `menu_password` in the app options and restart. The panel keeps showing the last good menu meanwhile. |
| Commands do not show when typing "/" | They were never registered | @BotFather → `/setcommands` (send the full list at once; it replaces the previous one). |

## Remote access

| Symptom | Cause | Fix |
|---|---|---|
| Tailscale address opens nothing | Missing `:8123` | Use `http://<tailscale-address>:8123` in the Companion app. |
| Someone else needs access without your Google account | Tailscale users are tied to identity providers | Invite them from the Tailscale admin console (**Users → Invite**) or share only the Home Assistant machine. |
| The panel answers 403 "host not allowed" | You opened it with a domain name the server does not know (protection against DNS rebinding) | Use the IP, `homeassistant.local` or the Tailscale name, or add the domain to `allowed_hosts`. |
| The log shows "Refused … (not used by the panel)" | Something asked the server for a Home Assistant call the panel never makes | Expected: the proxy only forwards what the panel uses. If you changed the panel to call something new, add it to `HA_GET_ALLOWED` / `HA_POST_ALLOWED` in `server/serve.py`. |
