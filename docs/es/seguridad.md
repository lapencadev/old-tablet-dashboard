# Seguridad

Qué protege el proyecto, cómo lo hace y qué queda en tus manos. Está pensado para la red de casa, no para internet.

## Qué hay que proteger

| Qué | Por qué importa |
|---|---|
| El token de Home Assistant | Con él, cualquiera controla toda tu casa (cerraduras, alarma, cámaras). Dentro de HA OS el servidor usa el token de la aplicación (el del supervisor), que es igual de potente. |
| Tu Home Assistant | Lo mismo, aunque no tengan el token, si algo le reenvía peticiones. |
| Los datos de casa | Las citas del calendario, las listas y el menú cuentan mucho de tu rutina. |
| La contraseña de tu web de menús | Protege la parte privada de la web. |

## Quién podría intentar algo

- **Alguien en tu Wi-Fi**: una visita, una tele inteligente, un aparato infectado.
- **Una página web abierta en cualquier aparato de casa**: puede hacer que el navegador mande peticiones a direcciones locales (CSRF) o apuntar su propio dominio a tu IP local (DNS rebinding).
- **Alguien que escriba a tu bot de Telegram** desde fuera del grupo familiar.
- **Alguien que lea el repo público** buscando datos personales.

## Qué te protege

| Riesgo | Protección | Dónde |
|---|---|---|
| Que roben el token desde la tablet | La tablet nunca lo tiene: lo añade el servidor al hablar con HA. | `server/serve.py` (`proxy`) |
| Que el servidor sea una puerta abierta a todo HA | Lista cerrada: leer estados y calendarios; y como acciones solo `weather.get_forecasts`, `todo.get_items`, `todo.update_item` e `input_boolean.turn_off`. Todo lo demás recibe un 403. | `HA_GET_ALLOWED`, `HA_POST_ALLOWED` |
| Que otra web mande cosas al panel (CSRF) | Los POST tienen que ser JSON: el navegador pide permiso antes (CORS) y el servidor nunca lo da. | `guard()` |
| DNS rebinding | Solo se aceptan IPs, nombres sin punto, dominios locales (`.local`, `.lan`, `.home.arpa`, `.ts.net`…) o los que pongas en `allowed_hosts`. | `host_allowed()` |
| Peticiones enormes | El cuerpo se corta a 64 KB. | `MAX_BODY` |
| Desconocidos usando el bot | Las automatizaciones y `/menu` solo contestan al `telegram_chat_id` configurado. | `ha/templates/*.yaml`, `server/menu_bot.py` |
| Datos personales en el repo | Un test revisa cada archivo buscando correos, IPs locales con puerto, ids de grupos de Telegram, nombres de Tailscale, tokens y tu propia lista de palabras (`PRIVATE_WORDS`). Tus archivos personales están en `.gitignore`. | `tests/test_no_personal_data.py` |
| Que se filtre la contraseña de la web de menús | Se guarda como opción de tipo contraseña de la aplicación de HA, nunca en un archivo; los datos se descifran en memoria. | `ha-app/config.yaml`, `server/adapters/static_site.py` |
| HTML colado desde las listas | El panel escapa todo el texto que viene de HA. Los platos de tu menú pueden llevar HTML sencillo a propósito (`<strong>`), así que sincroniza solo menús de fuentes tuyas. | `panel/app.js` (`esc`) |

## Lo que no hace (tu parte)

- **No hay usuario ni contraseña en el panel.** Cualquiera en tu Wi-Fi puede abrirlo, verlo y tachar cosas. Si te importa, pon a las visitas y a los aparatos inteligentes en otra red (casi todos los routers tienen red de invitados).
- **HTTP sin cifrar dentro de casa.** Las tablets viejas no pueden con el HTTPS moderno, así que lo que va entre la tablet y el servidor se puede leer desde la red local. No pongas en el panel nada que no dirías en voz alta en casa.
- **Nunca abras el puerto 8000 (ni el 8123) en el router.** Para usarlo fuera, Tailscale, que solo deja entrar a tus aparatos.
- **Usa un token solo para esto** si ejecutas el servidor fuera de HA OS, y bórralo de tu perfil de HA si lo dejas de usar.
- **La tablet de 2014 ya no recibe actualizaciones de seguridad**: úsala solo para el panel, sin cuentas personales ni otras apps.

## Si encuentras un fallo

Abre un issue sin dar detalles y pide un canal privado, o usa el aviso privado de vulnerabilidades de GitHub si está activado en el repo.
