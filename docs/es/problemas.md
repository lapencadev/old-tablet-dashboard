# Problemas frecuentes

Todo lo que falló al montar el sistema original (una tablet con Android 4.4, Home Assistant OS en una Raspberry Pi y un Mac), con la causa y el arreglo.

## Tablet

| Qué pasa | Por qué | Arreglo |
|---|---|---|
| `adb devices` no muestra nada | Cable que solo carga, o la tablet en modo MTP | Otro cable; modo USB **PTP**; acepta el aviso de depuración USB en la tablet. |
| No aparece la Wi-Fi de casa | Las tablets viejas solo ven redes de **2,4 GHz** | Conéctate a la red de 2,4 GHz del router (suele tener otro nombre que la de 5 GHz). |
| `pm disable-user` → *Permission Denial* | Android 4.4 no deja a adb desactivar aplicaciones del sistema | `tablet-debloat` usa `pm block` (solo KitKat) si falla. `--restore` deshace las dos cosas. |
| El panel sigue igual después de un cambio | La tablet guardó la versión anterior y el acceso directo no tiene botón de recargar | El servidor manda `Cache-Control: no-store`; **toca la hora** para recargar. Además se recarga solo cada 30 minutos. |
| Página en blanco o barra roja «Error JS» | JavaScript moderno en un archivo del panel (normalmente un `config.js` o `menu.js` editado a mano) | Quita `=>`, `let`, `const`, las comillas invertidas. `validate-menu` comprueba el menú; `check` pasa el control de ES5 a todos los archivos del panel. |
| Se corta el final de una columna | El alto real es menor de lo esperado (barras del navegador y de Android) | El panel recorta listas y reduce la letra solo. Si aún se corta, haz un `tablet-shot` y abre un issue con la captura. |
| Las webs HTTPS fallan en la tablet | Android 4.4 tiene los certificados raíz caducados | Usa el panel por HTTP en la red de casa (está pensado para eso). |

## Home Assistant

| Qué pasa | Por qué | Arreglo |
|---|---|---|
| `ha-check` → 401 | No es un token de larga duración, o se copió con espacios | Crea otro en tu perfil → **Seguridad**. |
| No conecta / «puerto no accesible» | Falta el puerto | Siempre `http://<dirección>:8123` (y `:8000` para el panel). |
| La integración de Google Calendar pide credenciales de Google Cloud y los tokens dan error | La integración oficial necesita tus propias credenciales OAuth | Usa la **dirección secreta iCal** del calendario con la integración **Remote Calendar**. |
| Los cambios del calendario tardan un día | Remote Calendar descarga cada 24 h | Instala la automatización de refresco: `deploy-ha --only calendar` (cada 15 minutos). |
| No se puede leer la lista compartida de Google Keep | Keep no tiene una forma oficial de conectarse | Usa una lista de tareas de Home Assistant y los comandos de Telegram. |
| Home Assistant cambió de dirección (por ejemplo `.40` → `.37`) | El router le dio otra concesión DHCP | Reserva la dirección en el router (paso 5 de la guía) y guarda la configuración del router. |
| `/api/hassio/...` responde 401 con un token de usuario | Esos endpoints del Supervisor no están disponibles para tokens de usuario | No es un error ni significa que tengas una instalación Docker: HA OS tiene el puerto 4357 del Supervisor y el menú **Aplicaciones**. |

## Aplicación local (`deploy-app`)

| Qué pasa | Por qué | Arreglo |
|---|---|---|
| La aplicación no aparece en la tienda | HA 2026 lee las aplicaciones locales de **`/local_apps`** (no de `/addons`) | `deploy-app` usa `/local_apps/tablet_panel`. Compruébalo por SSH. |
| La compilación falla con archivos raros `._algo` | macOS añade archivos de recursos al comprimir | `deploy-app` crea el archivo en Python y los salta. Si copias a mano en macOS, usa `COPYFILE_DISABLE=1`. |
| `ha store reload` da tiempo de espera agotado | La tienda tarda en una Raspberry Pi, pero sigue | `deploy-app` lo reintenta; vuelve a lanzarlo si hace falta. |
| Error de compilación con `BUILD_FROM` | HA OS 2026 ya no pasa una imagen base por defecto | El Dockerfile usa `python:3.12-alpine` directamente. |
| «Permission denied» al compilar | Archivos sin permiso de lectura para el compilador | `deploy-app` pone permisos 0644/0755 en el archivo. |
| Un aviso de «actualización disponible» que falla | La página enseña una versión que ya se reemplazó | Recarga la página de Home Assistant y vuelve a lanzar `deploy-app`. |
| Aviso de que la aplicación no se paró bien | El servidor ignoraba SIGTERM | Arreglado: el servidor sale con código 0 al recibir SIGTERM. |

## Telegram

| Qué pasa | Por qué | Arreglo |
|---|---|---|
| Los `/comandos` funcionan pero `+ leche` no hace nada | El modo privacidad del grupo está activado | @BotFather → `/setprivacy` → **Disable**; saca el bot del grupo y vuelve a meterlo. |
| `/menu` no contesta | Falta `telegram_chat_id` en las opciones de la aplicación, o la aplicación no está en marcha | Ponlo, reinicia la aplicación y busca «Telegram /menu: listening» en la pestaña **Registro**. |
| `/menu` sugiere muy pocos productos | Las líneas con varios productos se leían como uno | Arreglado: se separan por comas (los nombres con «y» se respetan). |
| El menú deja de actualizarse y el registro dice «wrong MENU_PASSWORD» | La contraseña de la web cambió o hay una errata en `menu_password` | Corrige `menu_password` en las opciones de la aplicación y reinicia. Mientras tanto el panel sigue mostrando el último menú bueno. |
| Los comandos no salen al escribir «/» | No se registraron | @BotFather → `/setcommands` (envía la lista completa de una vez; sustituye a la anterior). |

## Fuera de casa

| Qué pasa | Por qué | Arreglo |
|---|---|---|
| La dirección de Tailscale no abre nada | Falta `:8123` | Usa `http://<dirección-tailscale>:8123` en la Aplicación Companion. |
| Otra persona necesita acceso sin tu cuenta de Google | Los usuarios de Tailscale van ligados a un proveedor de identidad | Invítala desde la consola de Tailscale (**Users → Invite**) o comparte solo la máquina de Home Assistant. |
