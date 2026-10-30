# Security

What the project protects, how, and what is left to you. Written for a home network, not for the internet.

## What is worth protecting

| Asset | Why it matters |
|---|---|
| The Home Assistant token | With it, anyone controls your whole home (locks, alarms, cameras). Inside HA OS the server uses the app's supervisor token, which is just as powerful. |
| Your Home Assistant | Same as above, even without the token, if something forwards requests to it. |
| Household data | Calendar events, lists and the menu say a lot about your routine. |
| The menu site password | Protects the private part of your meal-planning site. |

## Who could try something

- **Someone on your Wi-Fi**: a guest, a smart TV, a compromised device.
- **A web page opened on any device of your network**: it can make the browser send requests to local addresses (CSRF) or point its own domain at your local IP (DNS rebinding).
- **Someone writing to your Telegram bot** from outside the family group.
- **Someone reading the public repo** looking for personal data.

## What protects you

| Threat | Protection | Where |
|---|---|---|
| Token stolen from the tablet | The tablet never gets it: the server adds it on the way to HA. | `server/serve.py` (`proxy`) |
| Open proxy to all of HA | Allowlist: GET states and calendars; POST only `weather.get_forecasts`, `todo.get_items`, `todo.update_item`, `input_boolean.turn_off`. Everything else is 403. | `HA_GET_ALLOWED`, `HA_POST_ALLOWED` |
| A web page posting to the panel (CSRF) | POSTs must be `application/json`; browsers ask first (CORS preflight) and the server never allows it. | `guard()` |
| DNS rebinding | Requests must use an IP, a name without dots, a local domain (`.local`, `.lan`, `.home.arpa`, `.ts.net`…) or a name in `allowed_hosts`. | `host_allowed()` |
| Huge requests | Bodies are capped at 64 KB. | `MAX_BODY` |
| Strangers using the bot | Automations and `/menu` only answer the configured `telegram_chat_id`. | `ha/templates/*.yaml`, `server/menu_bot.py` |
| Personal data in the repo | A test scans every tracked file for e-mails, LAN addresses with port, Telegram group ids, Tailscale names, tokens and your own word list (`PRIVATE_WORDS`). Personal files are in `.gitignore`. | `tests/test_no_personal_data.py` |
| Menu site password leaked | Stored as a `password` option of the HA app, never in a file; the site's data is decrypted in memory. | `ha-app/config.yaml`, `server/adapters/static_site.py` |
| Injected HTML from the menu or lists | The panel escapes every text from HA. Dish names from your own menu file may contain simple HTML on purpose (`<strong>`), so only sync menus from sources you control. | `panel/app.js` (`esc`) |

## What it does not do (your part)

- **No login.** Anyone on your Wi-Fi can open the panel, read it and tick items. If that matters, put guests and smart devices on a separate network (most routers have a guest network).
- **Plain HTTP on the LAN.** Old tablets cannot do modern HTTPS; traffic between tablet and server is readable on the local network. Do not show anything on the panel you would not say out loud at home.
- **Never forward port 8000 (or 8123) on your router.** For remote access use Tailscale, which only lets in your own devices.
- **Use a dedicated long-lived token** when you run the server outside HA OS, and delete it in your HA profile if you stop using it.
- **Keep Home Assistant, HA OS and the tablet's network separate from untrusted devices** as far as you can; the 2014 tablet itself gets no security updates.

## Reporting a problem

Open an issue without details and ask for a private channel, or use GitHub's private vulnerability reporting if it is enabled for the repo.
