/* Example menu (generic format, see docs/domain-model.md).
   Copy to panel/data/menu.js and edit, or let the server sync it from a menu source.
   ES5: this file is loaded by very old browsers, keep it a plain object literal. */
var MENU = {
  "people": [
    {
      "id": "a",
      "label": "Alex"
    },
    {
      "id": "b",
      "label": "Sam"
    }
  ],
  "meals": [
    {
      "id": "breakfast",
      "label": "Breakfast",
      "until": 10
    },
    {
      "id": "snack",
      "label": "Mid-morning",
      "until": 12
    },
    {
      "id": "lunch",
      "label": "Lunch",
      "until": 16,
      "tomorrow": true
    },
    {
      "id": "afternoon",
      "label": "Afternoon",
      "until": 19
    },
    {
      "id": "dinner",
      "label": "Dinner",
      "until": 24,
      "tomorrow": true
    }
  ],
  "weeks": {
    "autumn1": {
      "title": "Autumn week · batch cooking on Sunday",
      "start": "2026-11-02",
      "repeat": 2,
      "days": [
        {
          "breakfast": {
            "a": "Coffee and <strong>rye toast with ricotta and tomato</strong>",
            "b": "Coffee and <strong>oat porridge</strong> with banana and peanut butter"
          },
          "snack": {
            "a": "Apple and almonds (20g)",
            "b": "Banana and almonds (30g)"
          },
          "lunch": {
            "a": "Rocket salad • <strong>Turkey curry</strong> with onion and courgette (180g turkey) — see recipe book",
            "b": "Tomato soup • <strong>Turkey curry</strong> with onion and courgette (220g turkey) and basmati rice (80g)"
          },
          "afternoon": {
            "a": "Greek yogurt with walnuts and cinnamon",
            "b": "Protein shake with banana"
          },
          "dinner": {
            "a": "<strong>Mackerel salad</strong> with lamb's lettuce and a boiled egg — see recipe book",
            "b": "<strong>Mackerel salad</strong> with a boiled egg and wholegrain bread (60g)"
          }
        },
        {
          "breakfast": {
            "a": "Coffee and <strong>scrambled eggs on toast</strong>",
            "b": "Coffee and <strong>Greek yogurt</strong> with granola and berries"
          },
          "snack": {
            "a": "Yogurt with walnuts",
            "b": "Wholegrain sandwich with turkey"
          },
          "lunch": {
            "a": "Rocket salad • <strong>Lentil stew with chicken</strong> (lentils 200g, chicken 140g) — see recipe book",
            "b": "Tomato soup • <strong>Lentil stew with chicken</strong> (lentils 300g, chicken 160g) and bread (30g)"
          },
          "afternoon": {
            "a": "<strong>Oat and banana brownie</strong> (1 piece)",
            "b": "Protein shake with pear"
          },
          "dinner": {
            "a": "<strong>Pumpkin soup</strong> with boiled eggs and ham",
            "b": "<strong>Pumpkin soup</strong> with boiled eggs, ham and bread (40g)"
          }
        },
        {
          "breakfast": {
            "a": "Coffee and <strong>avocado toast with a boiled egg</strong>",
            "b": "Coffee and <strong>avocado toast with two eggs</strong>"
          },
          "snack": {
            "a": "Hummus with carrot sticks",
            "b": "Banana"
          },
          "lunch": {
            "a": "Rocket salad • <strong>Beef and courgette ragù</strong> without pasta — see recipe book",
            "b": "Tomato soup • <strong>Wholewheat pasta with beef and courgette ragù</strong> (pasta 90g)"
          },
          "afternoon": {
            "a": "Protein yogurt with walnuts",
            "b": "Protein shake with banana"
          },
          "dinner": {
            "a": "<strong>Courgette and turkey flatbread pizza</strong> — see recipe book",
            "b": "<strong>Courgette and turkey flatbread pizza</strong> (2 tortillas)"
          }
        },
        {
          "breakfast": {
            "a": "Coffee and <strong>cottage cheese with walnuts</strong>",
            "b": "Coffee and <strong>overnight oats</strong> with cocoa"
          },
          "snack": {
            "a": "Yogurt with walnuts",
            "b": "Wholegrain sandwich with cheese"
          },
          "lunch": {
            "a": "Rocket salad • <strong>Salmon poke bowl</strong> (salmon 125g, rice 20g, avocado) — see recipe book",
            "b": "Tomato soup • <strong>Salmon poke bowl</strong> (salmon 125g, rice 75g, avocado)"
          },
          "afternoon": {
            "a": "Mug cake (2 min, microwave)",
            "b": "Protein shake with pear"
          },
          "dinner": {
            "a": "<strong>Eggs with tomato and garlic</strong> and serrano ham",
            "b": "<strong>Eggs with tomato and garlic</strong> and bread to dip (60g)"
          }
        },
        {
          "breakfast": {
            "a": "Coffee and <strong>ham and cheese wrap</strong>",
            "b": "Coffee and <strong>ham and cheese wrap</strong> (2)"
          },
          "snack": {
            "a": "Pear and almonds (20g)",
            "b": "Banana and almonds (30g)"
          },
          "lunch": {
            "a": "Rocket salad • <strong>Beef fajita</strong> with spinach (1 tortilla)",
            "b": "Tomato soup • <strong>Beef fajitas</strong> with spinach (3 tortillas)"
          },
          "afternoon": {
            "a": "<strong>Oat and banana brownie</strong> (1 piece)",
            "b": "Protein shake with banana"
          },
          "dinner": {
            "a": "<strong>Garlic prawns with spinach</strong> — see recipe book",
            "b": "<strong>Garlic prawns with spinach</strong> and bread (80g)"
          }
        },
        {
          "breakfast": {
            "a": "<strong>Oat pancakes</strong> with yogurt and cinnamon",
            "b": "<strong>Oat pancakes</strong> with yogurt and honey"
          },
          "snack": {
            "a": "Fruit smoothie",
            "b": "Fruit smoothie"
          },
          "lunch": {
            "a": "Green salad • <strong>Oven-baked sea bream with onion and courgette</strong> — see recipe book",
            "b": "Green salad • <strong>Oven-baked sea bream with onion and courgette</strong> and potatoes (300g)"
          },
          "afternoon": {
            "a": "Hot chocolate with walnuts",
            "b": "Soy yogurt and two mandarins"
          },
          "dinner": {
            "a": "<strong>Pork loin with caramelised onion</strong> and lemon",
            "b": "<strong>Pork loin with caramelised onion</strong> and air-fried potatoes"
          }
        },
        {
          "breakfast": {
            "a": "<strong>Smoked salmon toast</strong> with cream cheese",
            "b": "<strong>Smoked salmon toast</strong> and a banana"
          },
          "snack": {
            "a": "Mandarins (2)",
            "b": "Mandarins (3)"
          },
          "lunch": {
            "a": "Green salad • <strong>Roast chicken with vegetables</strong> — see recipe book",
            "b": "Green salad • <strong>Roast chicken with vegetables</strong> and roast potatoes (300g)"
          },
          "afternoon": {
            "a": "Chocolate ricotta mousse",
            "b": "Soy yogurt and a banana"
          },
          "dinner": {
            "a": "<strong>Ham and cheese omelette</strong> with tomato salad",
            "b": "<strong>Ham and cheese omelette</strong> with tomato salad and bread (80g)"
          }
        }
      ]
    }
  },
  "shopping": {
    "autumn1": {
      "Meat & fish": [
        "Turkey breast (400g)",
        "Chicken breast (300g)",
        "Whole chicken for roasting",
        "Minced beef 5% fat (650g)",
        "Fresh salmon (250g)",
        "Sea bream (600g)",
        "Pork loin (230g)",
        "Prawns (300g)"
      ],
      "Fruit & vegetables": [
        "Courgettes (2kg)",
        "Onions (900g)",
        "Baby spinach (550g)",
        "Lamb's lettuce",
        "Tomatoes (1.8kg)",
        "Avocados (5)",
        "Potatoes (1kg)",
        "Bananas (9)",
        "Pears (2)",
        "Mandarins (4)"
      ],
      "Pantry": [
        "Cooked lentils (2 jars)",
        "Wholewheat pasta",
        "Basmati rice",
        "Tomato soup (1L)",
        "Pumpkin soup (700ml)",
        "Canned mackerel (3)",
        "Wholegrain bread",
        "Rye bread"
      ],
      "Dairy": [
        "Greek yogurt (1kg)",
        "Protein yogurts (3)",
        "Soy yogurts (9)",
        "Ricotta (250g)",
        "Cottage cheese"
      ],
      "Already at home / check": [
        "Eggs",
        "Olive oil",
        "Spices"
      ]
    }
  }
};
