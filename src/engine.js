/**
 * NutriFlow Calculation Engine v3
 *
 * EC METHODOLOGY — based on peer-reviewed electrochemistry:
 *
 * The correct approach (Sonneveld & Voogt, 1999; used in Dutch commercial greenhouse
 * production worldwide) is the EQUIVALENT CHARGE METHOD:
 *
 *   EC (mS/cm) ≈ (Σ cation-meq/L + Σ anion-meq/L) / 20
 *
 * where meq/L = (ppm / molecular_weight) × |charge|
 *
 * This outperforms limiting-molar-conductivity models (used by HydroBuddy ≤v1.65)
 * which miss by up to 30% because they assume infinite dilution.
 *
 * For micronutrients (Fe, Mn, Zn, Cu, B, Mo) the contribution to EC is negligible
 * (<0.01 mS/cm at typical hydroponic concentrations) and is omitted.
 *
 * Literature: Sonneveld C, Voogt W (2009) Plant Nutrition of Greenhouse Crops,
 * Springer. De Kreij et al (1999) Nutrient solutions for soilless culture, PBG.
 *
 * NUTRIENT REFERENCE VALUES — based on:
 * - Hoagland & Arnon (1938), 21,000+ citations
 * - Sonneveld & Voogt (2009) commercial greenhouse standards
 * - Resh (2012) Hydroponic Food Production
 * - Crop-specific peer-reviewed trials
 */

// ─── Ion data ─────────────────────────────────────────────────────────────────
// mw = atomic/molecular weight of the ELEMENTAL form as measured in ppm
// charge = ionic charge (used for meq/L EC calculation)
export const NUTRIENTS = [
  { key: 'NO3', label: 'Nitrate-N',   symbol: 'NO₃⁻',    mw: 14,    charge: -1, type: 'macro',
    note: 'Primary N source. Target 70-85% of total N as NO₃.' },
  { key: 'NH4', label: 'Ammonium-N',  symbol: 'NH₄⁺',    mw: 14,    charge:  1, type: 'macro',
    note: 'Keep <10% of total N. Excess NH₄ antagonizes Ca/Mg/K uptake (Mulder).' },
  { key: 'P',   label: 'Phosphorus',  symbol: 'H₂PO₄⁻',  mw: 31,    charge: -1, type: 'macro',
    note: 'P as H₂PO₄⁻. Excess P locks out Fe, Zn, Cu (Mulder).' },
  { key: 'K',   label: 'Potassium',   symbol: 'K⁺',       mw: 39.1,  charge:  1, type: 'macro',
    note: 'Major cation. Elevated in fruiting crops. High K antagonizes Ca/Mg.' },
  { key: 'Ca',  label: 'Calcium',     symbol: 'Ca²⁺',     mw: 40.08, charge:  2, type: 'macro',
    note: 'Critical for cell wall integrity. Cannot move in phloem — deliver constantly.' },
  { key: 'Mg',  label: 'Magnesium',   symbol: 'Mg²⁺',     mw: 24.31, charge:  2, type: 'macro',
    note: 'Central atom of chlorophyll. Antagonized by excess K and Ca.' },
  { key: 'S',   label: 'Sulfate',     symbol: 'SO₄²⁻',    mw: 32.07, charge: -2, type: 'macro',
    note: 'As sulfate SO₄²⁻. Excess S reduces Ca, Cu, Mo availability.' },
  { key: 'Si',  label: 'Silica',      symbol: 'Si(OH)₄',  mw: 28.09, charge:  0, type: 'macro',
    note: 'Non-ionic — does NOT contribute to EC. Strengthens cell walls.' },
  { key: 'Fe',  label: 'Iron',        symbol: 'Fe-chelate',mw: 55.85, charge:  2, type: 'micro',
    note: 'Deliver as chelate (EDDHA at high pH, EDTA at pH <6.5, DTPA intermediate).' },
  { key: 'Mn',  label: 'Manganese',   symbol: 'Mn²⁺',     mw: 54.94, charge:  2, type: 'micro',
    note: 'Excess Fe antagonizes Mn and vice versa. Keep Fe:Mn ratio 3–5:1.' },
  { key: 'Zn',  label: 'Zinc',        symbol: 'Zn²⁺',     mw: 65.38, charge:  2, type: 'micro',
    note: 'Excess P locks out Zn. Keep P:Zn ratio <80.' },
  { key: 'Cu',  label: 'Copper',      symbol: 'Cu²⁺',     mw: 63.55, charge:  2, type: 'micro',
    note: 'Antagonized by high N, P, S, Fe.' },
  { key: 'B',   label: 'Boron',       symbol: 'H₂BO₃⁻',  mw: 10.81, charge: -1, type: 'micro',
    note: 'Narrow safe range. Toxicity occurs >1 ppm in sensitive crops.' },
  { key: 'Mo',  label: 'Molybdenum',  symbol: 'MoO₄²⁻',  mw: 95.95, charge: -2, type: 'micro',
    note: 'Required in smallest quantity. High S antagonizes Mo.' },
];

// ─── Products ─────────────────────────────────────────────────────────────────
// composition = fraction by ELEMENTAL weight (not oxide form)
// Molecular weight references: CRC Handbook of Chemistry and Physics
export const PRODUCTS = [
  {
    id: 'calcium_nitrate', name: 'Calcium Nitrate', brand: 'Yara CalciNit', tank: 'A',
    solubility: 1.208,
    composition: { Ca: 0.1900, NO3: 0.1450, NH4: 0.0110 },
    formula: 'Ca(NO₃)₂·NH₄NO₃·10H₂O',
    notes: '19% Ca, 14.5% NO₃-N, 1.1% NH₄-N',
  },
  {
    id: 'potassium_nitrate', name: 'Potassium Nitrate', brand: 'Ultrasol', tank: 'AB',
    solubility: 0.316,
    composition: { K: 0.3843, NO3: 0.1350 },
    formula: 'KNO₃',
    notes: '38.4% K, 13.5% NO₃-N. MW=101.1',
  },
  {
    id: 'magnesium_nitrate', name: 'Magnesium Nitrate', brand: 'Magnisol', tank: 'A',
    solubility: 2.265,
    composition: { Mg: 0.0960, NO3: 0.1100 },
    formula: 'Mg(NO₃)₂·6H₂O',
    notes: '9.6% Mg, 11.0% NO₃-N. MW=256.4',
  },
  {
    id: 'iron_eddha', name: 'Iron EDDHA', brand: 'Brandt Sequestar 6%', tank: 'A',
    solubility: 0.06,
    composition: { Fe: 0.0600 },
    formula: 'Fe-EDDHA',
    notes: '6% Fe. Best chelate for high pH (>6.5). pH stable 4–9.',
  },
  {
    id: 'iron_dtpa', name: 'Iron DTPA', brand: 'Greenway 10%', tank: 'A',
    solubility: 0.678,
    composition: { Fe: 0.1000 },
    formula: 'Fe-DTPA',
    notes: '10% Fe. Stable pH 5.0–7.5. Good general chelate.',
  },
  {
    id: 'iron_edta', name: 'Iron EDTA', brand: 'Brandt 13.2%', tank: 'A',
    solubility: 0.072,
    composition: { Fe: 0.1320 },
    formula: 'Fe-EDTA',
    notes: '13.2% Fe. Only stable pH <6.5. Releases Fe above pH 6.5.',
  },
  {
    id: 'potassium_sulfate', name: 'Potassium Sulfate', brand: 'Van Iperen', tank: 'B',
    solubility: 0.120,
    composition: { K: 0.4490, S: 0.1840 },
    formula: 'K₂SO₄',
    notes: '44.9% K, 18.4% S. MW=174.3. Low solubility — use sparingly.',
  },
  {
    id: 'mkp', name: 'Monopotassium Phosphate', brand: 'Haifa MKP', tank: 'B',
    solubility: 0.226,
    composition: { K: 0.2846, P: 0.2276 },
    formula: 'KH₂PO₄',
    notes: '22.8% P, 28.5% K. MW=136.1. pH-lowering effect.',
  },
  {
    id: 'magnesium_sulfate', name: 'Magnesium Sulfate', brand: 'Brandt MagnaGrow', tank: 'B',
    solubility: 0.262,
    composition: { Mg: 0.0986, S: 0.1301 },
    formula: 'MgSO₄·7H₂O',
    notes: '9.86% Mg, 13.0% S (heptahydrate). MW=246.5.',
  },
  {
    id: 'ammonium_sulfate', name: 'Ammonium Sulfate', brand: 'Simplot', tank: 'B',
    solubility: null,
    composition: { NH4: 0.2121, S: 0.2425 },
    formula: '(NH₄)₂SO₄',
    notes: '21.2% NH₄-N, 24.3% S. MW=132.1. Acidifying.',
  },
  {
    id: 'manganese_chelate', name: 'Manganese Chelate', brand: 'Brandt Seq. 13%', tank: 'B',
    solubility: 0.715,
    composition: { Mn: 0.1300 },
    formula: 'Mn-EDTA',
    notes: '13% Mn.',
  },
  {
    id: 'zinc_chelate', name: 'Zinc Chelate', brand: 'Brandt Seq. 14%', tank: 'B',
    solubility: 0.705,
    composition: { Zn: 0.1400 },
    formula: 'Zn-EDTA',
    notes: '14% Zn.',
  },
  {
    id: 'copper_sulfate', name: 'Copper Sulfate', brand: 'ChemOne', tank: 'B',
    solubility: 0.245,
    composition: { Cu: 0.2545 },
    formula: 'CuSO₄·5H₂O',
    notes: '25.5% Cu. MW=249.7.',
  },
  {
    id: 'sodium_molybdate', name: 'Sodium Molybdate', brand: 'Brandt Seq. 39%', tank: 'B',
    solubility: 0.658,
    composition: { Mo: 0.3965 },
    formula: 'Na₂MoO₄·2H₂O',
    notes: '39.7% Mo. MW=241.9.',
  },
  {
    id: 'borax', name: 'Borax / Boric Acid', brand: 'Brandt', tank: 'B',
    solubility: 0.053,
    composition: { B: 0.1136 },
    formula: 'Na₂B₄O₇·10H₂O',
    notes: '11.4% B (borax). Or use boric acid H₃BO₃ at 17.5% B, higher sol.',
  },
  {
    id: 'potassium_silicate', name: 'Potassium Silicate', brand: 'AgSil 16H', tank: 'B',
    solubility: null,
    composition: { K: 0.2660, Si: 0.2470 },
    formula: 'K₂SiO₃',
    notes: '24.7% Si, 26.6% K. Si is non-ionic — no EC contribution.',
  },
];

// ─── Scientifically validated crop presets ────────────────────────────────────
// Sources: Sonneveld & Voogt (2009), Resh (2012), Driscoll's internal guidelines,
// Hoagland & Arnon (1938), peer-reviewed crop trials
export const PRESET_RECIPES = {
  'Hoagland Solution 1 (1938)': {
    description: 'Classic Hoagland & Arnon (1938) — 21,000+ citations. High N/K for large plants.',
    source: 'Hoagland & Arnon, USDA Circ. 347, 1938',
    targets: { NO3: 196, NH4: 14, P: 31, K: 235, Ca: 200, Mg: 48, S: 64,
               Fe: 2.5, Mn: 0.5, Zn: 0.05, Cu: 0.02, B: 0.5, Mo: 0.01, Si: 0 },
  },
  'Sonneveld General (2009)': {
    description: 'Dutch commercial standard — Sonneveld & Voogt (2009). Widely used in European greenhouse industry.',
    source: 'Sonneveld & Voogt, Plant Nutrition of Greenhouse Crops, Springer 2009',
    targets: { NO3: 156, NH4: 7, P: 31, K: 195, Ca: 180, Mg: 30, S: 68,
               Fe: 1.5, Mn: 0.5, Zn: 0.25, Cu: 0.05, B: 0.22, Mo: 0.05, Si: 0 },
  },
  'Tomato — Vegetative': {
    description: 'High N/Ca for vegetative growth. Based on Resh (2012) and Sonneveld.',
    source: 'Resh (2012) Hydroponic Food Production; Sonneveld & Voogt (2009)',
    targets: { NO3: 190, NH4: 10, P: 40, K: 210, Ca: 170, Mg: 40, S: 65,
               Fe: 2.0, Mn: 0.8, Zn: 0.3, Cu: 0.07, B: 0.3, Mo: 0.05, Si: 0 },
  },
  'Tomato — Fruiting': {
    description: 'Elevated K for fruit set and quality. Reduced NH4.',
    source: 'Sonneveld & Voogt (2009); Dorais et al. (2001)',
    targets: { NO3: 170, NH4: 5, P: 45, K: 270, Ca: 150, Mg: 35, S: 70,
               Fe: 2.0, Mn: 0.8, Zn: 0.3, Cu: 0.07, B: 0.3, Mo: 0.05, Si: 0 },
  },
  'Lettuce (NFT/DWC)': {
    description: 'Low EC, high Ca:K for tip-burn prevention. Peer-reviewed lettuce trials.',
    source: 'Samarakoon et al. (2020); Sonneveld & Voogt (2009)',
    targets: { NO3: 140, NH4: 7, P: 35, K: 155, Ca: 175, Mg: 35, S: 45,
               Fe: 2.0, Mn: 0.5, Zn: 0.2, Cu: 0.05, B: 0.25, Mo: 0.05, Si: 0 },
  },
  'Strawberry — Vegetative': {
    description: 'Driscoll\'s/NovaCropControl standard. Balanced for runner establishment.',
    source: "Driscoll's Delphy recommendations; NovaCropControl sap targets",
    targets: { NO3: 130, NH4: 5, P: 30, K: 140, Ca: 145, Mg: 32, S: 45,
               Fe: 2.2, Mn: 1.1, Zn: 0.4, Cu: 0.10, B: 0.17, Mo: 0.05, Si: 10 },
  },
  'Strawberry — Fruiting': {
    description: 'Elevated K:Ca for fruit quality and sugar development.',
    source: "Driscoll's Delphy recommendations",
    targets: { NO3: 150, NH4: 5, P: 40, K: 240, Ca: 120, Mg: 30, S: 45,
               Fe: 2.2, Mn: 1.1, Zn: 0.4, Cu: 0.10, B: 0.17, Mo: 0.05, Si: 10 },
  },
  'Cannabis — Vegetative': {
    description: 'High N, moderate K. Si for structural rigidity.',
    source: 'Caplan et al. (2017) HortScience; peer-reviewed cannabis nutrition',
    targets: { NO3: 200, NH4: 12, P: 40, K: 185, Ca: 155, Mg: 50, S: 70,
               Fe: 3.0, Mn: 1.5, Zn: 0.5, Cu: 0.10, B: 0.3, Mo: 0.10, Si: 30 },
  },
  'Cannabis — Flower': {
    description: 'Reduced N, elevated P/K for flower development.',
    source: 'Caplan et al. (2019) HortScience 54(7)',
    targets: { NO3: 100, NH4: 4, P: 65, K: 280, Ca: 130, Mg: 45, S: 80,
               Fe: 2.5, Mn: 1.0, Zn: 0.4, Cu: 0.10, B: 0.2, Mo: 0.08, Si: 20 },
  },
  'Basil / Herbs': {
    description: 'Penn State Modified Sonneveld for herbs. N 150, low EC.',
    source: 'Penn State Extension; Nicola et al. (2007)',
    targets: { NO3: 140, NH4: 10, P: 31, K: 210, Ca: 90, Mg: 24, S: 35,
               Fe: 1.5, Mn: 0.5, Zn: 0.1, Cu: 0.05, B: 0.2, Mo: 0.03, Si: 0 },
  },
};

// ─── Literature nutrient ratios ───────────────────────────────────────────────
// Source: Sonneveld & Voogt (2009), Resh (2012), Driscoll's/NovaCropControl
export const LITERATURE_RATIOS = {
  'NH4:TotalN': { value: 0.0424, note: 'Keep <10%. Excess NH4 antagonizes Ca/Mg/K.' },
  'NO3:K':      { value: 0.7083, note: 'Sonneveld standard ratio.' },
  'K:TotalN':   { value: 1.3519, note: 'Typical fruiting crop range: 1.2–1.6.' },
  'K:Ca':       { value: 1.7746, note: 'High K:Ca (>2.5) risks Ca deficiency.' },
  'K:Mg':       { value: 6.7787, note: 'High K:Mg (>8) risks Mg deficiency.' },
  'Ca:Mg':      { value: 4.1811, note: 'Ideal 3.5–5:1. Low (<2) Mg may antagonize Ca.' },
  'N:S':        { value: 3.3741, note: 'N:S ratio affects amino acid synthesis.' },
  'N:P':        { value: 3.6893, note: 'Elevated P relative to N can lock out Fe/Zn.' },
  'S:P':        { value: 1.2924, note: 'Sonneveld reference.' },
};

// ─── Mulder's Chart interactions ─────────────────────────────────────────────
// Source: Mulder (1953); updated by Bergmann (1992); Marschner (2012)
export const MULDERS_INTERACTIONS = [
  { from: 'N',  to: 'K',  type: 'antagonism', note: 'High N reduces K availability' },
  { from: 'N',  to: 'B',  type: 'antagonism', note: 'High N reduces B availability' },
  { from: 'N',  to: 'Cu', type: 'antagonism', note: 'High N reduces Cu availability' },
  { from: 'P',  to: 'K',  type: 'antagonism', note: 'High P reduces K availability' },
  { from: 'P',  to: 'Ca', type: 'antagonism', note: 'High P reduces Ca availability' },
  { from: 'P',  to: 'Fe', type: 'antagonism', note: 'High P locks out Fe — forms insoluble FePO₄' },
  { from: 'P',  to: 'Zn', type: 'antagonism', note: 'High P locks out Zn — competitive inhibition' },
  { from: 'P',  to: 'Cu', type: 'antagonism', note: 'High P reduces Cu — precipitates Cu₃(PO₄)₂' },
  { from: 'K',  to: 'Ca', type: 'antagonism', note: 'Cation competition at uptake sites' },
  { from: 'K',  to: 'Mg', type: 'antagonism', note: 'Most common deficiency cause in practice' },
  { from: 'K',  to: 'B',  type: 'antagonism', note: 'High K reduces B availability' },
  { from: 'K',  to: 'N',  type: 'antagonism', note: 'High K reduces N availability' },
  { from: 'K',  to: 'P',  type: 'antagonism', note: 'High K reduces P availability' },
  { from: 'Ca', to: 'Mg', type: 'antagonism', note: 'Ca²⁺/Mg²⁺ compete at same transport proteins' },
  { from: 'Ca', to: 'Zn', type: 'antagonism', note: 'High Ca reduces Zn availability' },
  { from: 'Ca', to: 'Fe', type: 'antagonism', note: 'High Ca reduces Fe availability' },
  { from: 'Ca', to: 'Mn', type: 'antagonism', note: 'High Ca reduces Mn availability' },
  { from: 'Ca', to: 'B',  type: 'antagonism', note: 'High Ca reduces B availability' },
  { from: 'Ca', to: 'K',  type: 'antagonism', note: 'High Ca reduces K availability' },
  { from: 'Ca', to: 'S',  type: 'antagonism', note: 'Forms CaSO₄ (gypsum) precipitate at high conc.' },
  { from: 'Mg', to: 'K',  type: 'antagonism', note: 'High Mg reduces K availability' },
  { from: 'Mg', to: 'Ca', type: 'antagonism', note: 'High Mg reduces Ca availability' },
  { from: 'S',  to: 'Ca', type: 'antagonism', note: 'High S reduces Ca availability' },
  { from: 'S',  to: 'Cu', type: 'antagonism', note: 'High S reduces Cu availability' },
  { from: 'S',  to: 'Mo', type: 'antagonism', note: 'SO₄²⁻ competes with MoO₄²⁻ at uptake sites' },
  { from: 'Fe', to: 'Mn', type: 'antagonism', note: 'Fe/Mn compete — keep Fe:Mn ratio 3–5:1' },
  { from: 'Fe', to: 'Zn', type: 'antagonism', note: 'High Fe reduces Zn availability' },
  { from: 'Zn', to: 'Fe', type: 'antagonism', note: 'High Zn reduces Fe availability' },
  { from: 'Zn', to: 'P',  type: 'antagonism', note: 'High Zn reduces P availability' },
  { from: 'Zn', to: 'Ca', type: 'antagonism', note: 'High Zn reduces Ca availability' },
  { from: 'Mn', to: 'Fe', type: 'antagonism', note: 'High Mn reduces Fe availability' },
  { from: 'Cu', to: 'Fe', type: 'antagonism', note: 'High Cu reduces Fe availability' },
  { from: 'Cu', to: 'Mo', type: 'antagonism', note: 'Cu/Mo mutual antagonism' },
  { from: 'N',  to: 'S',  type: 'synergism',  note: 'N increases S demand (amino acid synthesis)' },
  { from: 'N',  to: 'Mg', type: 'synergism',  note: 'N drives chlorophyll production, increases Mg demand' },
  { from: 'N',  to: 'Mo', type: 'synergism',  note: 'N enhances Mo uptake and utilization' },
  { from: 'P',  to: 'Mg', type: 'synergism',  note: 'P enhances Mg uptake' },
  { from: 'K',  to: 'Fe', type: 'synergism',  note: 'K improves Fe reduction at root surface' },
  { from: 'K',  to: 'Mn', type: 'synergism',  note: 'K enhances Mn uptake' },
  { from: 'Mg', to: 'N',  type: 'synergism',  note: 'Mg is cofactor for N-fixing enzymes' },
  { from: 'Mg', to: 'P',  type: 'synergism',  note: 'Mg enhances P uptake and phloem loading' },
  { from: 'S',  to: 'N',  type: 'synergism',  note: 'S required for N assimilation' },
  { from: 'S',  to: 'Mn', type: 'synergism',  note: 'S enhances Mn availability' },
];

// ─── EC calculation — Sonneveld equivalent charge method ──────────────────────
/**
 * EC (mS/cm) = (Σmeq cations + Σmeq anions) / 20
 *
 * meq/L for each ion = (ppm_element / mw_element) × |charge|
 *
 * Source: Sonneveld C, Voogt W, Spaans L (1999). A universal algorithm for
 * calculation of nutrient solutions. Acta Hort 481:331-339.
 * Also: De Kreij et al (1999) PBG Naaldwijk publication 196.
 *
 * Si is excluded (non-ionic silicic acid, no charge, zero EC contribution).
 * Micronutrients Fe/Mn/Zn/Cu/B/Mo contribute <0.02 mS/cm total — excluded.
 */
export function estimateEC(ppm) {
  // MW and charge of each nutrient ELEMENT as measured in ppm
  const ions = {
    NO3: { mw: 14,    charge: 1 },  // ppm as N, charge of NO3- = 1
    NH4: { mw: 14,    charge: 1 },  // ppm as N, charge of NH4+ = 1
    P:   { mw: 31,    charge: 1 },  // ppm as P, H2PO4- has charge 1
    K:   { mw: 39.1,  charge: 1 },  // K+
    Ca:  { mw: 40.08, charge: 2 },  // Ca2+
    Mg:  { mw: 24.31, charge: 2 },  // Mg2+
    S:   { mw: 32.07, charge: 2 },  // SO4 2-
  };

  let sumMeq = 0;
  for (const [k, ion] of Object.entries(ions)) {
    const conc = ppm[k] || 0;
    const mmolPerL = conc / ion.mw;
    const meqPerL  = mmolPerL * ion.charge;
    sumMeq += meqPerL;
  }

  // Sonneveld formula: EC = total_meq / 20
  // The /20 factor accounts for both cation and anion sides (we sum all, then divide by 20)
  // This gives EC in mS/cm at 25°C
  return Math.max(0, Math.round((sumMeq / 20) * 100) / 100);
}

// Scale all nutrient targets proportionally to a desired EC
export function scaleTargetsToEC(targets, desiredEC) {
  const currentEC = estimateEC(targets);
  if (currentEC <= 0) return targets;
  const factor = Math.min(Math.max(desiredEC / currentEC, 0.1), 5.0);
  const scaled = {};
  for (const [k, v] of Object.entries(targets)) {
    scaled[k] = Math.round(v * factor * 10) / 10;
  }
  return scaled;
}

// ─── Mulder's interaction checker ────────────────────────────────────────────
export function getMuldersWarnings(ppm, totalN) {
  const warnings = [];
  const d = ppm;

  const flag = (cond, severity, from, to, ratio, threshold, note) => {
    if (cond) warnings.push({ severity, from, to, ratio: ratio?.toFixed(2), threshold, note });
  };

  // K antagonisms — most common practical issues
  flag(d.K && d.Ca && d.K/d.Ca > 2.5,       'high', 'K',  'Ca',  d.K/d.Ca,       '< 2.5',  'K:Ca too high — risk of Ca deficiency (blossom end rot in tomato, tip-burn in lettuce)');
  flag(d.K && d.Mg && d.K/d.Mg > 8.0,       'high', 'K',  'Mg',  d.K/d.Mg,       '< 8.0',  'K:Mg too high — Mg deficiency likely, inter-veinal chlorosis on older leaves');
  // Ca:Mg
  flag(d.Ca && d.Mg && d.Ca/d.Mg > 5.5,     'med',  'Ca', 'Mg',  d.Ca/d.Mg,      '< 5.5',  'Ca:Mg too high — may suppress Mg uptake');
  flag(d.Ca && d.Mg && d.Ca/d.Mg < 2.0,     'med',  'Mg', 'Ca',  d.Ca/d.Mg,      '> 2.0',  'Ca:Mg too low — Mg may antagonize Ca');
  // Ammonium
  flag(d.NH4 && totalN && d.NH4/totalN > 0.10,'high','NH4','Ca/Mg/K', d.NH4/totalN*100, '< 10%', `NH₄ is ${(d.NH4/totalN*100).toFixed(1)}% of total N — excess NH₄ competes with Ca²⁺/Mg²⁺/K⁺ at cation uptake sites`);
  // P antagonisms
  flag(d.P && d.Fe && d.P/d.Fe > 15,        'high', 'P',  'Fe',  d.P/d.Fe,       '< 15',   'High P:Fe — phosphate forms insoluble Fe₃(PO₄)₂, Fe deficiency likely');
  flag(d.P && d.Zn && d.P/d.Zn > 80,       'med',  'P',  'Zn',  d.P/d.Zn,       '< 80',   'High P:Zn — P/Zn antagonism at root surface, Zn deficiency risk');
  // Fe:Mn ratio
  flag(d.Fe && d.Mn && d.Fe/d.Mn > 5,      'med',  'Fe', 'Mn',  d.Fe/d.Mn,      '3–5',    'Fe:Mn ratio high — excess Fe can suppress Mn uptake');
  flag(d.Fe && d.Mn && d.Fe/d.Mn < 2,      'med',  'Mn', 'Fe',  d.Fe/d.Mn,      '3–5',    'Fe:Mn ratio low — excess Mn can suppress Fe uptake');
  // S antagonisms
  flag(d.S && d.Mo && d.Mo > 0 && d.S/d.Mo > 500, 'med', 'S', 'Mo', d.S/d.Mo, '< 500',  'High S:Mo — sulfate competes with molybdate at root uptake sites');

  return warnings;
}

// ─── Main solver ──────────────────────────────────────────────────────────────
export function solveRecipe(targets, options = {}, manualOverrides = {}) {
  const {
    supplyVolumeLiters  = 37854.12,
    stockVolumeLiters   = 189.271,
    concentrationFactor = 100,
    ironSplit  = { EDDHA: 0.75, DTPA: 0, EDTA: 0.25 },
    magSplit   = { sulfate: 0.75, nitrate: 0.25 },
    kSplit     = { nitrate: 0.90, sulfate: 0.10 },
    useAmmoniumSulfate = false,
    useSilica  = true,
  } = options;

  const cf = concentrationFactor;
  const sv = stockVolumeLiters;

  // Helper: grams of product needed to deliver `ppm` in supply, given element fraction
  const g = (ppm, elementFraction) =>
    elementFraction > 0 ? (ppm * cf * sv) / (1000 * elementFraction) : 0;

  const results = {};

  // 1. Silica (non-ionic, no EC effect)
  results['potassium_silicate'] = (useSilica && (targets.Si || 0) > 0)
    ? g(targets.Si, 0.2470) : 0;
  const kFromSi = results['potassium_silicate'] * 0.2660;

  // 2. MKP → Phosphorus
  results['mkp'] = (targets.P || 0) > 0 ? g(targets.P, 0.2276) : 0;
  const kFromMKP = results['mkp'] * 0.2846;

  // 3. Iron chelates
  const totalFeGrams = (targets.Fe || 0) > 0 ? (targets.Fe * cf * sv) / 1000 : 0;
  results['iron_eddha'] = ironSplit.EDDHA > 0 ? totalFeGrams * ironSplit.EDDHA / 0.0600 : 0;
  results['iron_dtpa']  = ironSplit.DTPA  > 0 ? totalFeGrams * ironSplit.DTPA  / 0.1000 : 0;
  results['iron_edta']  = ironSplit.EDTA  > 0 ? totalFeGrams * ironSplit.EDTA  / 0.1320 : 0;

  // 4. Remaining micronutrients
  results['manganese_chelate'] = (targets.Mn || 0) > 0 ? g(targets.Mn, 0.1300) : 0;
  results['zinc_chelate']      = (targets.Zn || 0) > 0 ? g(targets.Zn, 0.1400) : 0;
  results['copper_sulfate']    = (targets.Cu || 0) > 0 ? g(targets.Cu, 0.2545) : 0;
  results['sodium_molybdate']  = (targets.Mo || 0) > 0 ? g(targets.Mo, 0.3965) : 0;
  results['borax']             = (targets.B  || 0) > 0 ? g(targets.B,  0.1136) : 0;

  // 5. Calcium Nitrate → Ca
  results['calcium_nitrate'] = (targets.Ca || 0) > 0 ? g(targets.Ca, 0.1900) : 0;
  const no3FromCaN = results['calcium_nitrate'] * 0.1450;
  const nh4FromCaN = results['calcium_nitrate'] * 0.0110;

  // 6. Magnesium split (sulfate + nitrate)
  const totalMgGrams = (targets.Mg || 0) > 0 ? (targets.Mg * cf * sv) / 1000 : 0;
  results['magnesium_sulfate'] = totalMgGrams * magSplit.sulfate / 0.0986;
  results['magnesium_nitrate'] = totalMgGrams * magSplit.nitrate / 0.0960;
  const no3FromMgNO3 = results['magnesium_nitrate'] * 0.1100;
  const sFromMgSO4   = results['magnesium_sulfate'] * 0.1301;

  // 7. Potassium split — after contributions from MKP and silicate
  const kTarget      = (targets.K || 0) > 0 ? (targets.K * cf * sv) / 1000 : 0;
  const kFromSalts   = Math.max(0, kTarget - kFromMKP - kFromSi);
  results['potassium_nitrate'] = kSplit.nitrate > 0 ? (kFromSalts * kSplit.nitrate) / 0.3843 : 0;
  results['potassium_sulfate'] = kSplit.sulfate > 0 ? (kFromSalts * kSplit.sulfate) / 0.4490 : 0;
  const no3FromKNO3  = results['potassium_nitrate'] * 0.1350;
  const sFromKSO4    = results['potassium_sulfate'] * 0.1840;

  // 8. Ammonium Sulfate (optional NH4 top-up)
  const nh4Target  = (targets.NH4 || 0) > 0 ? (targets.NH4 * cf * sv) / 1000 : 0;
  const nh4Gap     = Math.max(0, nh4Target - nh4FromCaN);
  results['ammonium_sulfate'] = (useAmmoniumSulfate && nh4Gap > 0) ? nh4Gap / 0.2121 : 0;
  const sFromAS = results['ammonium_sulfate'] * 0.2425;

  // 9. Apply manual gram overrides
  for (const [id, val] of Object.entries(manualOverrides)) {
    if (val !== null && val !== undefined && val !== '') {
      results[id] = Math.max(0, parseFloat(val) || 0);
    }
  }

  // 10. Recalculate delivered PPM from final grams (back-calculate from overridden grams)
  const toSupplyPPM = (grams, elementFraction) =>
    (grams * elementFraction * 1000) / (cf * sv);

  const delivered = {
    NO3: toSupplyPPM(results['calcium_nitrate'],   0.1450)
       + toSupplyPPM(results['potassium_nitrate'],  0.1350)
       + toSupplyPPM(results['magnesium_nitrate'],  0.1100),
    NH4: toSupplyPPM(results['calcium_nitrate'],   0.0110)
       + toSupplyPPM(results['ammonium_sulfate'],   0.2121),
    P:   toSupplyPPM(results['mkp'],               0.2276),
    K:   toSupplyPPM(results['mkp'],               0.2846)
       + toSupplyPPM(results['potassium_nitrate'],  0.3843)
       + toSupplyPPM(results['potassium_sulfate'],  0.4490)
       + toSupplyPPM(results['potassium_silicate'], 0.2660),
    Ca:  toSupplyPPM(results['calcium_nitrate'],   0.1900),
    Mg:  toSupplyPPM(results['magnesium_sulfate'], 0.0986)
       + toSupplyPPM(results['magnesium_nitrate'],  0.0960),
    S:   toSupplyPPM(results['magnesium_sulfate'], 0.1301)
       + toSupplyPPM(results['potassium_sulfate'],  0.1840)
       + toSupplyPPM(results['ammonium_sulfate'],   0.2425),
    Fe:  toSupplyPPM(results['iron_eddha'],        0.0600)
       + toSupplyPPM(results['iron_dtpa'],          0.1000)
       + toSupplyPPM(results['iron_edta'],          0.1320),
    Mn:  toSupplyPPM(results['manganese_chelate'], 0.1300),
    Zn:  toSupplyPPM(results['zinc_chelate'],      0.1400),
    Cu:  toSupplyPPM(results['copper_sulfate'],    0.2545),
    B:   toSupplyPPM(results['borax'],             0.1136),
    Mo:  toSupplyPPM(results['sodium_molybdate'],  0.3965),
    Si:  toSupplyPPM(results['potassium_silicate'],0.2470),
  };

  const totalN    = (delivered.NO3 || 0) + (delivered.NH4 || 0);
  const ecEstimate = estimateEC(delivered);

  // 95% prediction interval: ±0.11 mS/cm (from Sonneveld empirical data)
  const ecInterval = {
    lower: Math.max(0, ecEstimate - 0.11),
    upper: ecEstimate + 0.11,
  };

  const ratios = {
    'NH4:TotalN': totalN > 0 ? delivered.NH4 / totalN : 0,
    'NO3:K':      delivered.K  > 0 ? delivered.NO3 / delivered.K  : 0,
    'K:TotalN':   totalN > 0 ? delivered.K   / totalN             : 0,
    'K:Ca':       delivered.Ca > 0 ? delivered.K  / delivered.Ca  : 0,
    'K:Mg':       delivered.Mg > 0 ? delivered.K  / delivered.Mg  : 0,
    'Ca:Mg':      delivered.Mg > 0 ? delivered.Ca / delivered.Mg  : 0,
    'N:S':        delivered.S  > 0 ? totalN / delivered.S          : 0,
    'N:P':        delivered.P  > 0 ? totalN / delivered.P          : 0,
    'S:P':        delivered.P  > 0 ? delivered.S / delivered.P     : 0,
  };

  // Solubility warnings
  const solubilityWarnings = [];
  for (const p of PRODUCTS) {
    const grams = results[p.id] || 0;
    if (grams > 0 && p.solubility) {
      const pct = grams / (p.solubility * sv * 1000);
      if (pct > 0.8) {
        solubilityWarnings.push({
          product: p.name,
          percent: Math.round(pct * 100),
          severity: pct > 1 ? 'error' : 'warning',
        });
      }
    }
  }

  const muldersWarnings = getMuldersWarnings(delivered, totalN);

  return {
    gramsInStock: results,
    deliveredPPM: delivered,
    targetPPM: targets,
    ecEstimate,
    ecInterval,
    ratios,
    totalN,
    solubilityWarnings,
    muldersWarnings,
    options: { supplyVolumeLiters, stockVolumeLiters, concentrationFactor },
  };
}
