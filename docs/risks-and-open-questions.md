# Risks and Open Questions

## Risks

| Risk | Mitigation |
|---|---|
| A modern JS feature slips into the panel and the old tablet shows a blank page. | ES5 check (`acorn --ecma5`) in `./init.sh` and CI; on-screen JS error banner. |
| Personal data leaks into the public repo. | Example data only; `config.js`, `.env`, menu files and photos are git-ignored; a test greps the tree for known patterns (chat-id shape, private IP + port, emails). |
| HA OS changes the local-app workflow again (it changed name and folder in 2026). | Deploy logic isolated in `tools/panel.py deploy-app`; troubleshooting doc records the 2026 behaviour. |
| Telegram bot silent in groups. | Guide step for BotFather group privacy; troubleshooting entry. |
| Menu source apps change their format. | Adapters are small and tested with fixtures; the panel only knows the generic format. |
| Windows users without bash. | All user commands are `python tools/panel.py …`; `init.sh` is a thin wrapper for agents. |

## Open Questions

| Question | Class | Initial position |
|---|---|---|
| Should the HA YAML packages be offered as HA *packages* (`packages/` folder) instead of REST deploy? | Later | REST deploy (works without editing `configuration.yaml`); mention packages as an alternative. |
| Shopping sections for supermarkets other than Mercadona. | Implementation-time | Ship generic sections in EN and Mercadona-style aisles in ES as data files; users edit JSON. |
| Bot messages for `+`/`-`/`!` in more languages. | Later | EN and ES only. |
| AI in the Telegram bot (free-text requests). | Later | Listed under "Future ideas" in the README. |
