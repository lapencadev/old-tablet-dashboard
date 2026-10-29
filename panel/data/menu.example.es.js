/* Menú de ejemplo en español (formato genérico, ver docs/domain-model.md). Lo usa `panel.py demo --lang es`. */
var MENU = {
  "people": [
    {
      "id": "a",
      "label": "Ana"
    },
    {
      "id": "b",
      "label": "Javi"
    }
  ],
  "meals": [
    {
      "id": "breakfast",
      "label": "Desayuno",
      "until": 10
    },
    {
      "id": "snack",
      "label": "Media mañana",
      "until": 12
    },
    {
      "id": "lunch",
      "label": "Comida",
      "until": 16,
      "tomorrow": true
    },
    {
      "id": "afternoon",
      "label": "Merienda",
      "until": 19
    },
    {
      "id": "dinner",
      "label": "Cena",
      "until": 24,
      "tomorrow": true
    }
  ],
  "weeks": {
    "otono1": {
      "title": "Semana de otoño · batch el domingo",
      "start": "2026-11-02",
      "repeat": 2,
      "days": [
        {
          "breakfast": {
            "a": "Café y <strong>tostada de centeno con ricota y tomate</strong>",
            "b": "Café y <strong>porridge de avena</strong> con plátano y crema de cacahuete"
          },
          "snack": {
            "a": "Manzana y almendras (20g)",
            "b": "Plátano y almendras (30g)"
          },
          "lunch": {
            "a": "Rúcula • <strong>Pavo al curry</strong> con cebolla y calabacín (pavo 180g) — ver recetario",
            "b": "Gazpacho • <strong>Pavo al curry</strong> con cebolla y calabacín (pavo 220g) y arroz basmati (80g)"
          },
          "afternoon": {
            "a": "Yogur griego con nueces y canela",
            "b": "Batido de proteína con plátano"
          },
          "dinner": {
            "a": "<strong>Ensalada de caballa</strong> con canónigos y huevo duro — ver recetario",
            "b": "<strong>Ensalada de caballa</strong> con huevo duro y pan integral (60g)"
          }
        },
        {
          "breakfast": {
            "a": "Café y <strong>huevos revueltos en tostada</strong>",
            "b": "Café y <strong>yogur griego</strong> con granola y frutos rojos"
          },
          "snack": {
            "a": "Yogur con nueces",
            "b": "Bocadillo integral de pavo"
          },
          "lunch": {
            "a": "Rúcula • <strong>Lentejas estofadas con pollo</strong> (lentejas 200g, pollo 140g) — ver recetario",
            "b": "Gazpacho • <strong>Lentejas estofadas con pollo</strong> (lentejas 300g, pollo 160g) y pan (30g)"
          },
          "afternoon": {
            "a": "<strong>Brownie de avena y plátano</strong> (1 porción)",
            "b": "Batido de proteína con pera"
          },
          "dinner": {
            "a": "<strong>Crema de calabaza</strong> con huevo duro y jamón",
            "b": "<strong>Crema de calabaza</strong> con huevo duro, jamón y pan (40g)"
          }
        },
        {
          "breakfast": {
            "a": "Café y <strong>tostada de aguacate con huevo duro</strong>",
            "b": "Café y <strong>tostada de aguacate con dos huevos</strong>"
          },
          "snack": {
            "a": "Hummus con palitos de zanahoria",
            "b": "Plátano"
          },
          "lunch": {
            "a": "Rúcula • <strong>Boloñesa de ternera y calabacín</strong> sin pasta — ver recetario",
            "b": "Gazpacho • <strong>Macarrones integrales con boloñesa de ternera y calabacín</strong> (pasta 90g)"
          },
          "afternoon": {
            "a": "Yogur de proteínas con nueces",
            "b": "Batido de proteína con plátano"
          },
          "dinner": {
            "a": "<strong>Pizza fit de pavo y calabacín</strong> — ver recetario",
            "b": "<strong>Pizza fit de pavo y calabacín</strong> (2 tortillas)"
          }
        },
        {
          "breakfast": {
            "a": "Café y <strong>requesón con nueces</strong>",
            "b": "Café y <strong>avena remojada</strong> con cacao"
          },
          "snack": {
            "a": "Yogur con nueces",
            "b": "Bocadillo integral de queso"
          },
          "lunch": {
            "a": "Rúcula • <strong>Poké de salmón</strong> (salmón 125g, arroz 20g, aguacate) — ver recetario",
            "b": "Gazpacho • <strong>Poké de salmón</strong> (salmón 125g, arroz 75g, aguacate)"
          },
          "afternoon": {
            "a": "Mug cake (2 min, microondas)",
            "b": "Batido de proteína con pera"
          },
          "dinner": {
            "a": "<strong>Huevos rotos con tomate y ajo</strong> y jamón serrano",
            "b": "<strong>Huevos rotos con tomate y ajo</strong> y pan para mojar (60g)"
          }
        },
        {
          "breakfast": {
            "a": "Café y <strong>wrap de jamón y queso</strong>",
            "b": "Café y <strong>wrap de jamón y queso</strong> (2)"
          },
          "snack": {
            "a": "Pera y almendras (20g)",
            "b": "Plátano y almendras (30g)"
          },
          "lunch": {
            "a": "Rúcula • <strong>Fajita de ternera</strong> con espinacas (1 tortilla)",
            "b": "Gazpacho • <strong>Fajitas de ternera</strong> con espinacas (3 tortillas)"
          },
          "afternoon": {
            "a": "<strong>Brownie de avena y plátano</strong> (1 porción)",
            "b": "Batido de proteína con plátano"
          },
          "dinner": {
            "a": "<strong>Gambas al ajillo con espinacas</strong> — ver recetario",
            "b": "<strong>Gambas al ajillo con espinacas</strong> y pan (80g)"
          }
        },
        {
          "breakfast": {
            "a": "<strong>Tortitas de avena</strong> con yogur y canela",
            "b": "<strong>Tortitas de avena</strong> con yogur y miel"
          },
          "snack": {
            "a": "Batido de fruta",
            "b": "Batido de fruta"
          },
          "lunch": {
            "a": "Ensalada • <strong>Dorada al horno con cebolla y calabacín</strong> — ver recetario",
            "b": "Ensalada • <strong>Dorada al horno con cebolla y calabacín</strong> y patatas (300g)"
          },
          "afternoon": {
            "a": "Chocolate caliente con nueces",
            "b": "Yogur de soja y dos mandarinas"
          },
          "dinner": {
            "a": "<strong>Lomo con cebolla caramelizada</strong> y limón",
            "b": "<strong>Lomo con cebolla caramelizada</strong> y patatas en freidora de aire"
          }
        },
        {
          "breakfast": {
            "a": "<strong>Tosta de salmón ahumado</strong> con queso crema",
            "b": "<strong>Tosta de salmón ahumado</strong> y un plátano"
          },
          "snack": {
            "a": "Mandarinas (2)",
            "b": "Mandarinas (3)"
          },
          "lunch": {
            "a": "Ensalada • <strong>Pollo asado con verduras</strong> — ver recetario",
            "b": "Ensalada • <strong>Pollo asado con verduras</strong> y patatas asadas (300g)"
          },
          "afternoon": {
            "a": "Mousse de chocolate y ricota",
            "b": "Yogur de soja y un plátano"
          },
          "dinner": {
            "a": "<strong>Tortilla francesa de jamón y queso</strong> con ensalada de tomate",
            "b": "<strong>Tortilla francesa de jamón y queso</strong> con tomate y pan (80g)"
          }
        }
      ]
    }
  },
  "shopping": {
    "otono1": {
      "Carne y pescado": [
        "Pechuga de pavo (400g)",
        "Pechuga de pollo (300g)",
        "Pollo para asar",
        "Ternera picada (650g)",
        "Salmón fresco (250g)",
        "Dorada (600g)",
        "Lomo de cerdo (230g)",
        "Gambas (300g)"
      ],
      "Fruta y verdura": [
        "Calabacines (2kg)",
        "Cebollas (900g)",
        "Espinacas baby (550g)",
        "Canónigos",
        "Tomates (1,8kg)",
        "Aguacates (5)",
        "Patatas (1kg)",
        "Plátanos (9)",
        "Peras (2)",
        "Mandarinas (4)"
      ],
      "Despensa": [
        "Lentejas cocidas (2 botes)",
        "Macarrones integrales",
        "Arroz basmati",
        "Gazpacho (1L)",
        "Crema de calabaza (700ml)",
        "Caballa en lata (3)",
        "Pan integral",
        "Pan de centeno"
      ],
      "Lácteos": [
        "Yogur griego (1kg)",
        "Yogures de proteínas (3)",
        "Yogures de soja (9)",
        "Ricota (250g)",
        "Requesón"
      ],
      "Ya en casa / comprobar": [
        "Huevos",
        "Aceite de oliva",
        "Especias"
      ]
    }
  }
};
