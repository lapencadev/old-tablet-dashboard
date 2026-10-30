# De dónde sale el menú

El panel siempre enseña el archivo `panel/data/menu.js`, con el formato que se explica en [domain-model.md](../domain-model.md) (en inglés). Hay tres formas de tener ese archivo:

| Forma | Cuándo te encaja | Qué configurar |
|---|---|---|
| 1. Escribirlo a mano | Planificas la semana en notas o en papel y lo pasas una vez a la semana | nada: editas `panel/data/menu.js` y lanzas `deploy-app` |
| 2. `generic` (una dirección web) | Ya generas un archivo con este formato en algún sitio (un script, una hoja de cálculo exportada) | `menu_url` = la dirección de ese archivo; `recipes_url` = la de un `recipes.json` (opcional) |
| 3. `static-site` (una web tuya) | Tus menús están en una web pequeña hecha de archivos estáticos, como la de la autora | `menu_url` = la dirección de la web; `menu_people` = los nombres de quienes coméis; `menu_password` si una parte de la web es privada |

Con las formas 2 y 3, el servidor descarga el menú **cada hora**. Si la descarga falla o lo que llega no es válido, se queda con el menú anterior y apunta el motivo en la pestaña **Registro** de la aplicación.

## El formato `static-site`

Es el formato de la web de menús de la autora. Lo explico aquí para que puedas publicar tu web igual, o para que te sirva de modelo si quieres conectar otra app (el código está en `server/adapters/static_site.py`). En `tests/fixtures/static_site/` tienes ejemplos pequeños y completos.

La web publica tres archivos:

| Archivo | Qué lleva |
|---|---|
| `js/data/weeks.data.js` | Los menús de cada semana: `const WEEKS_DATA = { … }` |
| `js/data/shop.data.js` | La lista de la compra de cada semana: `const SHOP_LISTS = { … }` (opcional) |
| `js/recipes-content.js` | El recetario, como fichas en HTML (opcional) |

### `WEEKS_DATA`

```js
const WEEKS_DATA = {
  wB: {                                     // la clave de la semana (un id corto cualquiera)
    title: 'Semana B · 2-15 noviembre 2026', // si no hay `start`, las fechas se leen del título
    start: '2026-11-02',                    // opcional: el lunes en que empieza
    weeks: 2,                               // opcional: el mismo menú dos semanas seguidas
    days: [                                 // exactamente 7 días, empezando por el lunes
      { slots: [
        { time: 'Comida · 14h', r: 'Ensalada • <strong>Pavo al curry</strong> — ver recetario', j: 'Gazpacho • <strong>Pavo al curry</strong> con arroz' },
        { time: 'Cena', r: '<strong>Tortilla de jamón</strong>' }
      ] },
      …
    ]
  }
};
```

- `r` es lo que come la primera persona y `j` (opcional) lo que come la segunda. Sus nombres en el panel salen de `menu_people` (por ejemplo `Ana, Javi`).
- El nombre de la comida es el texto de `time` hasta el `·` o el `—`. Entiende estos: `Café` (hasta las 9:00), `Desayuno` y `Media mañana` (12:00), `Comida` (16:00), `Merienda` (19:00) y `Cena` (24:00). Cualquier otro nombre cuenta como la última comida del día. `Comida` y `Cena` salen también en «Mañana».
- Pon el plato principal en `<strong>`: es lo que se ve en el panel. El resto aparece al tocar la comida.
- Las fechas del título pueden cruzar de mes (`28 septiembre – 4 octubre 2026`), con los meses en español. Si tu web está en otro idioma, usa `start`.
- Una semana que no tenga justo siete días se ignora.

### `SHOP_LISTS`

```js
const SHOP_LISTS = {
  wB: {                                               // la misma clave que la semana
    'Ya en casa / comprobar': [ { id: 'h1', label: 'Huevos (~28)' } ],   // las categorías que empiezan así no se sugieren
    'Carne y pescado': [
      { id: 'p1', label: 'Pechuga de pavo (~380g, curry del lunes)' },
      { id: 'p2', label: 'Canónigos (1), tomate (1kg), ajo' }            // varios productos en una línea: se separan por comas
    ]
  }
};
```

`/menu` convierte cada línea en uno o varios botones: lo que va detrás de `(`, `—` o `:` se quita, y una línea con comas se convierte en varios productos. Los nombres que llevan «y» (*crema de calabaza y zanahoria*) se respetan enteros.

### Fichas del recetario (`recipes-content.js`)

Cada receta es un bloque HTML como este. Solo importan las clases; el resto de la página puede ser como quieras:

```html
<div class="card" data-alias="Pavo al curry con brócoli|Curry de pavo">
  <span class="badge">15 min</span><span class="badge">batch</span>
  <div class="ctitle">Pavo al curry rápido</div>
  <div class="csub">Cremoso sin nata.</div>
  <ul class="ing"><li>200g de pavo</li><li>60ml de leche evaporada</li></ul>
  <ol class="steps"><li>Sofreír la cebolla.</li><li>Cocer 10 minutos.</li></ol>
  <div class="tip">Aguanta tres días en la nevera.</div>
</div>
```

`data-alias` (opcional, separado por `|`) son otros nombres de la misma receta, por ejemplo cuando juntaste varias fichas en una. Al tocar una comida, el panel busca la receta cuyo título, o alguno de sus alias, se parece más al plato principal.

### Webs con una parte privada

Si una parte de tu web está protegida con contraseña, el menú y la compra no se publican sueltos: van dentro de **`private.enc.json`**, y el recetario puede seguir siendo público.

```json
{ "v": 1, "iterations": 600000, "salt": "<base64>", "iv": "<base64>", "data": "<base64>" }
```

- La clave: PBKDF2-HMAC-SHA256 de la contraseña con `salt` e `iterations`, de 32 bytes.
- `data`: AES-256-GCM con esa clave y el `iv` (con la etiqueta de 16 bytes al final, que es como la escribe Web Crypto en el navegador).
- Descifrado: una lista JSON de bloques HTML. Las etiquetas `<script>` de dentro que definen `WEEKS_DATA` y `SHOP_LISTS` son los archivos de arriba.

Pon la misma contraseña en la opción **`menu_password`** de la aplicación (Home Assistant la guarda oculta). Si la contraseña está mal, el Registro lo dice y el panel se queda con el último menú que bajó. Si cambias la contraseña de tu web, acuérdate de cambiarla también aquí.
