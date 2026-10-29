/* Panel configuration. Copy this file to panel/config.js and edit it there
   (config.js is git-ignored, so your entity names and photos stay private).
   ES5: plain object literal, no trailing commas needed but allowed. */
var PANEL_CONFIG = {
  LANG: 'en',                     // 'en' | 'es'

  // Home Assistant, through the server proxy (the server adds the token).
  HA_BASE: '/ha',
  CALENDARS: 'auto',              // every calendar.* entity, or a list: ['calendar.family', 'calendar.work']
  MAIN_CALENDAR: 'calendar.family', // shown without a chip; the others get their name as a chip
  TASKS: 'todo.tasks',
  SHOPPING: 'todo.shopping',
  WEATHER: 'weather.home',        // '' to hide
  REFRESH_SECONDS: 60,

  // How many rows before "+N more" (the panel lowers them further if the screen is small).
  TASKS_MAX: 5,
  SHOPPING_MAX: 7,
  AGENDA_MAX_PER_DAY: 4,

  // Night mode (Auto): dark between these hours.
  NIGHT_FROM: 23,
  NIGHT_TO: 7,

  // Banners while an input_boolean is on. The button turns it off.
  ALERTS: [
    { entity: 'input_boolean.laundry_waiting', text: '🧺 The washing machine is done: laundry to hang', button: 'Done' }
  ],
  // Banners some days before an input_datetime / input_date.
  DATE_ALERTS: [
    { entity: 'input_datetime.vet_visit', text: '🐱 Vet visit', daysBefore: 7 }
  ],

  // Small daily checklist in the header (hours are 0-24). Ticks are shared by every screen.
  CHECKLIST: [
    { id: 'morning', icon: '☀️', label: 'Vitamin D', sub: 'with breakfast', from: 7, to: 11 },
    { id: 'plants', icon: '🪴', label: 'Plants', sub: 'water', from: 18, to: 21 }
  ],

  // Photos for the free space (files in panel/img/). Several rotate every PHOTO_MINUTES.
  PHOTOS: [{ src: 'img/example-photo.svg', caption: 'Sunday walk' }],
  PHOTOS_SIDE: [],
  PHOTO_MINUTES: 10
};
