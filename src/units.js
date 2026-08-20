/**
 * FertiCalc unit system — single source of truth for metric/imperial display.
 *
 * All internal state (targets in ppm, options in liters, product grams, EC in
 * mS/cm) stays canonical (SI-ish: grams, liters) regardless of display mode.
 * Only presentation and user-entry parsing go through here.
 *
 * Conversion constants are exact defined values (international agreement),
 * not measured/rounded approximations:
 *   1 lb = 453.59237 g
 *   1 US gal = 3.785411784 L
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export const LB_TO_G = 453.59237;
export const GAL_TO_L = 3.785411784;
const OZ_TO_G = LB_TO_G / 16;       // 28.349523125
const FLOZ_TO_L = GAL_TO_L / 128;   // 0.0295735295625

const STORAGE_KEY = 'ferticalc_units';

const UnitsContext = createContext(null);

export function UnitsProvider({ children }) {
  const [system, setSystem] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'imperial' ? 'imperial' : 'metric'; }
    catch { return 'metric'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, system); } catch { /* ignore */ }
  }, [system]);

  const toggle = useCallback(() => setSystem(s => s === 'metric' ? 'imperial' : 'metric'), []);

  const value = useMemo(() => makeUnitsApi(system, setSystem, toggle), [system, toggle]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits() must be used within a UnitsProvider');
  return ctx;
}

// ─── Pure conversion helpers (exported for non-hook use, e.g. CSV export) ──
export function gToDisplayMass(grams, system) {
  if (system === 'imperial') {
    const lb = grams / LB_TO_G;
    return Math.abs(lb) >= 1 ? { value: lb, unit: 'lb' } : { value: lb * 16, unit: 'oz' };
  }
  return Math.abs(grams) >= 1000 ? { value: grams / 1000, unit: 'kg' } : { value: grams, unit: 'g' };
}

export function lToDisplayVolume(liters, system) {
  if (system === 'imperial') {
    const gal = liters / GAL_TO_L;
    return Math.abs(gal) >= 1 ? { value: gal, unit: 'gal' } : { value: gal * 128, unit: 'fl oz' };
  }
  return Math.abs(liters) >= 1 ? { value: liters, unit: 'L' } : { value: liters * 1000, unit: 'mL' };
}

// density: grams of solute per mL of water (as stored in PRODUCTS[].solubility)
export function densityToDisplay(gPerMl, system) {
  if (system === 'imperial') {
    // lb of solute per US gallon of water
    return { value: gPerMl * (GAL_TO_L * 1000) / LB_TO_G, unit: 'lb/gal' };
  }
  return { value: gPerMl, unit: 'g/mL' };
}

export function displayDensityToGPerMl(value, system) {
  const v = parseFloat(value) || 0;
  return system === 'imperial' ? v * LB_TO_G / (GAL_TO_L * 1000) : v;
}

function makeUnitsApi(system, setSystem, toggle) {
  const bigMassUnitLabel = system === 'imperial' ? 'lb' : 'kg';
  const smallMassUnitLabel = system === 'imperial' ? 'oz' : 'g';
  const volumeUnitLabel = system === 'imperial' ? 'gal' : 'L';
  const densityUnitLabel = system === 'imperial' ? 'lb/gal' : 'g/mL';

  // Compact display string, e.g. "1.24 kg" / "8.4 oz" / "3 bags - 2,001 g"
  const formatMass = (grams, precision) => {
    if (grams === null || grams === undefined || isNaN(grams)) return '—';
    const { value, unit } = gToDisplayMass(grams, system);
    const p = precision !== undefined ? precision : (unit === 'g' || unit === 'oz' ? 1 : 2);
    return `${value.toFixed(p)} ${unit}`;
  };

  const formatVolume = (liters, precision) => {
    if (liters === null || liters === undefined || isNaN(liters)) return '—';
    const { value, unit } = lToDisplayVolume(liters, system);
    const p = precision !== undefined ? precision : (unit === 'mL' || unit === 'fl oz' ? 0 : 2);
    return `${value.toFixed(p)} ${unit}`;
  };

  const formatDensity = (gPerMl, precision) => {
    if (gPerMl === null || gPerMl === undefined || isNaN(gPerMl)) return '—';
    const { value, unit } = densityToDisplay(gPerMl, system);
    return `${value.toFixed(precision !== undefined ? precision : 3)} ${unit}`;
  };

  // Always-grams mass formatter for small/precise quantities (e.g. bag remainders),
  // still unit-aware: grams under metric, ounces under imperial.
  const formatSmallMass = (grams, precision = 0) => {
    if (grams === null || grams === undefined || isNaN(grams)) return '—';
    if (system === 'imperial') return `${(grams / OZ_TO_G).toFixed(precision)} oz`;
    return `${grams.toFixed(precision)} g`;
  };

  // Round-trip helpers for editable numeric fields — always a fixed unit per
  // system (not magnitude-switching like formatMass/formatVolume) so the
  // field's unit doesn't change out from under the user while they type.
  // toFieldValue: canonical liters/grams -> number to put in an <input>
  // fromFieldValue: number typed by the user -> canonical liters/grams
  const volumeToFieldValue = liters => system === 'imperial' ? liters / GAL_TO_L : liters;
  const volumeFromFieldValue = val => system === 'imperial' ? (parseFloat(val) || 0) * GAL_TO_L : (parseFloat(val) || 0);
  const massToFieldValue = grams => system === 'imperial' ? grams / OZ_TO_G : grams;
  const massFromFieldValue = val => system === 'imperial' ? (parseFloat(val) || 0) * OZ_TO_G : (parseFloat(val) || 0);
  const densityToFieldValue = gPerMl => densityToDisplay(gPerMl, system).value;
  const densityFromFieldValue = val => displayDensityToGPerMl(val, system);
  // Bag sizes are large-scale (25-50lb bags) so use the kg/lb pair, not g/oz.
  const bagSizeToFieldValue = grams => system === 'imperial' ? grams / LB_TO_G : grams / 1000;
  const bagSizeFromFieldValue = val => system === 'imperial' ? (parseFloat(val) || 0) * LB_TO_G : (parseFloat(val) || 0) * 1000;

  return {
    system, setSystem, toggle,
    bigMassUnitLabel, smallMassUnitLabel, volumeUnitLabel, densityUnitLabel,
    formatMass, formatVolume, formatDensity, formatSmallMass,
    volumeToFieldValue, volumeFromFieldValue,
    massToFieldValue, massFromFieldValue,
    densityToFieldValue, densityFromFieldValue,
    bagSizeToFieldValue, bagSizeFromFieldValue,
  };
}
