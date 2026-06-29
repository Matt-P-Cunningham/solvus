# NutriFlow — Hydroponic Nutrient Calculator

A professional desktop application for hydroponic nutrient management. Built from your `Nutrient_Calculator_V3.xlsx` logic, rebuilt as a modern Electron + React app.

---

## Features

- **Real-time nutrient solver** — Calculates exact grams of each fertilizer product to hit your PPM targets
- **A/B tank split** — Products correctly separated into Tank A and Tank B
- **Iron/Magnesium/Potassium splits** — Configurable ratio between product sources
- **EC prediction** — Regression-based electrical conductivity estimate with 95% prediction interval
- **Solubility warnings** — Alerts when approaching max solubility limits
- **Nutrient ratios** — Compare your K:Ca, N:P, NH4:TotalN etc. against literature averages
- **Radar chart analysis** — Visual balance view of target vs. delivered concentrations
- **Preset recipes** — Strawberry (Veg/Fruit), Tomato, Lettuce, Cannabis (Veg/Flower)
- **Save/load recipes** — Persist your own formulas between sessions
- **CSV export** — Export the full product mix and nutrient analysis
- **Settings panel** — Configure tank volumes, concentration factor, product splits

---

## Tech Stack

- **Electron** — Desktop app shell (cross-platform: Mac, Windows, Linux)
- **React 18** — UI
- **Recharts** — Radar chart visualization
- **Lucide React** — Icons

---

## Setup & Development

### Prerequisites
- Node.js 18+ 
- npm 9+

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```
This starts the React dev server on port 3000 and launches Electron pointing to it.

### Build for production
```bash
npm run build
```
Outputs a distributable app to the `dist/` folder.

---

## Project Structure

```
nutriflow/
├── electron/
│   ├── main.js          # Electron main process (window, menus, file I/O)
│   └── preload.js       # Secure bridge between Electron and React
├── src/
│   ├── engine.js        # 🧠 Core calculation engine (nutrient solver)
│   ├── App.js           # Full UI — all 5 tabs
│   ├── App.css          # Dark professional design system
│   └── index.js         # React entry point
├── public/
│   └── index.html
└── package.json
```

---

## Calculation Engine (`src/engine.js`)

The solver works through products in a dependency order:

1. **Potassium Silicate** → fills Si target, contributes K
2. **MKP** → fills P target, contributes K  
3. **Iron chelates** → fills Fe target (split across EDDHA/DTPA/EDTA by your % settings)
4. **Manganese, Zinc, Copper, Molybdenum, Boron** chelates → fills respective micro targets
5. **Calcium Nitrate** → fills Ca target, contributes NO3 and NH4
6. **Magnesium Sulfate + Magnesium Nitrate** → fills Mg target (split by your % settings)
7. **Potassium Nitrate + Potassium Sulfate** → fills remaining K after MKP and silicate contributions
8. **Ammonium Sulfate** (optional) → fills remaining NH4 gap

EC is estimated using per-ion conductance coefficients calibrated to the regression in your spreadsheet.

---

## Extending the App

### Add a new product
In `src/engine.js`, add to the `PRODUCTS` array:
```js
{
  id: 'my_product',
  name: 'My Product',
  brand: 'Brand Name',
  tank: 'B',            // 'A', 'B', or 'AB'
  solubility: 0.350,    // g/mL water, or null if unknown
  composition: { K: 0.40, S: 0.17 },   // fraction by weight
  notes: '40% K, 17% S',
}
```
Then add the solver logic in `solveRecipe()`.

### Add a new preset recipe
```js
export const PRESET_RECIPES = {
  'My New Crop': {
    description: 'Custom recipe for my crop',
    targets: { NO3: 160, NH4: 8, P: 35, K: 210, ... },
  },
};
```

---

## Roadmap / Future Features

- [ ] Municipal water analysis input (subtract background nutrients)
- [ ] Sap analysis input + feed recommendation engine
- [ ] Multi-zone support (different recipes for different farm zones)
- [ ] Week-by-week recipe scheduling
- [ ] Tissue analysis interpretation against Driscoll's / NovaCropControl ranges
- [ ] Fertilizer compatibility chart
- [ ] Batch calculator (how many kg for X batches)
- [ ] PDF report generation
- [ ] Cloud sync / team sharing
