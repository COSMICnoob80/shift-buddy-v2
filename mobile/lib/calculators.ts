/**
 * CKD-EPI 2021 (race-free) eGFR
 * sex: 'male' | 'female'
 * age: years
 * creatinine: mg/dL
 * Returns: eGFR in mL/min/1.73 m²
 */
export function calcGFR(sex: 'male' | 'female', age: number, creatinine: number): number {
  const kappa = sex === 'female' ? 0.7 : 0.9;
  const alpha = sex === 'female' ? -0.241 : -0.302;
  const sexFactor = sex === 'female' ? 1.012 : 1.0;

  const ratio = creatinine / kappa;
  const term1 = Math.pow(Math.min(ratio, 1), alpha);
  const term2 = Math.pow(Math.max(ratio, 1), -1.2);
  const ageFactor = Math.pow(0.9938, age);

  return 142 * term1 * term2 * ageFactor * sexFactor;
}

/**
 * Corrected calcium for hypoalbuminaemia
 * calcium: mg/dL (measured total)
 * albumin: g/dL (measured)
 * Returns: corrected calcium in mg/dL
 */
export function calcCorrectedCalcium(calcium: number, albumin: number): number {
  return calcium + 0.8 * (4.0 - albumin);
}

/**
 * Anion gap (standard formula)
 * na, cl, hco3: mEq/L
 * Returns: anion gap in mEq/L (normal 8–12)
 */
export function calcAnionGap(na: number, cl: number, hco3: number): number {
  return na - (cl + hco3);
}
