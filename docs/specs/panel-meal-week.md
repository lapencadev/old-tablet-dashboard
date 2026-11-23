# panel-meal-week

**Goal**: see the menu for a whole week, not only today and tomorrow.

**Behaviour**
- A "see week ›" button in the Today header opens a large modal: one column per day (Monday first), one row per meal of `menu.meals` (meals no day uses are left out). Today's column is highlighted.
- Each cell shows the first person's main dish and, below, other people's dish when it differs.
- Every day comes from `planFor`, so repeated weeks and the week picked by hand apply. Days with no week covering them show "—"; a week with nothing shows a message.
- ‹ › changes week; "This week" comes back.
- Tapping a dish opens the usual meal detail with its recipe; its button goes back to the week.

**Verification**: e2e `panel-meal-week` (8 header cells, 5 meal rows, today highlighted, ‹ › and back, detail and back, close; no JS errors).
