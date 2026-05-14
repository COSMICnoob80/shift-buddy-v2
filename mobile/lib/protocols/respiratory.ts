/**
 * Respiratory Distress protocol — SpO2 + clinical context-based management.
 * Source: Doctor On Duty 2021 (ch10-acute-asthma, ch10-pulmonary-edema,
 *                                 ch10-pulmonary-embolism, ch10-aecopd)
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'Respiratory Distress Management (Doctor On Duty 2021 / BTS Guidelines)';

type BreathSounds = 'clear' | 'wheeze' | 'crackles' | 'silent_chest';

export function evaluate(
  spo2: number,
  respiratoryRate: number,
  breathSounds: BreathSounds,
  knownAsthmaCopd: boolean,
  chestPain: boolean,
): ProtocolResult {
  const hypoxic = spo2 < 94;
  const tachypneic = respiratoryRate > 24;
  const severeHypoxia = spo2 < 90;

  if (!hypoxic && !tachypneic) {
    return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
  }
  // Wheeze → asthma/COPD pathway
  if (breathSounds === 'wheeze' || breathSounds === 'silent_chest') {
    return _asthmaPathway(spo2, respiratoryRate, breathSounds, severeHypoxia);
  }

  // Crackles → pulmonary edema pathway
  if (breathSounds === 'crackles') {
    return _pulmonaryEdemaPathway(spo2, severeHypoxia);
  }

  // Suspected PE → if pleuritic chest pain + hypoxia
  if (chestPain && hypoxic) {
    return _pePathway(spo2, severeHypoxia);
  }

  // Non-specific respiratory distress
  return _generalRespiratory(spo2, respiratoryRate, severeHypoxia);
}

function _commonO2(): Recommendation[] {
  return [
    { action: 'High-flow O2 via non-rebreather mask — target SpO2 > 94%', priority: 1, rationale: 'Correct hypoxia — first priority', source: SOURCE },
    { action: 'Sit patient upright (unless hypotensive)', priority: 2, rationale: 'Optimize diaphragmatic excursion', source: SOURCE },
    { action: 'Obtain CXR (portable if unstable)', priority: 3, rationale: 'Identify etiology (pneumothorax, effusion, consolidation, edema)', source: SOURCE },
    { action: 'ABG STAT — pH, pCO2, pO2, HCO3, lactate', priority: 4, rationale: 'Assess ventilation and oxygenation status', source: SOURCE },
  ];
}

function _asthmaPathway(
  spo2: number,
  rr: number,
  sounds: BreathSounds,
  severe: boolean,
): ProtocolResult {
  const recs = _commonO2();
  recs.push(
    { action: 'Salbutamol nebulization 5mg in 3mL NS — STAT, repeat q20min up to 3 doses', priority: recs.length + 1, rationale: `Bronchodilator — first-line for asthma exacerbation`, source: 'ch10-acute-asthma-er-rx' },
    { action: 'Ipratropium bromide nebulization 500mcg — add to first nebulization', priority: recs.length + 2, rationale: 'Additive bronchodilation', source: 'ch10-acute-asthma-er-rx' },
    { action: 'Hydrocortisone 200mg IV stat (or Prednisolone 40-60mg PO if can swallow)', priority: recs.length + 3, rationale: 'Systemic steroids reduce airway inflammation', source: 'ch10-acute-asthma-er-rx' },
  );

  if (sounds === 'silent_chest') {
    recs.push(
      { action: 'SILENT CHEST — impeding respiratory arrest, CALL SENIOR + ICU IMMEDIATELY', priority: recs.length + 1, rationale: 'No air entry = critical obstruction', source: SOURCE },
      { action: 'Consider IV magnesium sulfate 2g over 20 min', priority: recs.length + 2, rationale: 'Additional bronchodilation in severe asthma', source: SOURCE },
      { action: 'Prepare for non-invasive ventilation (BiPAP) or intubation', priority: recs.length + 3, rationale: 'May require ventilatory support', source: SOURCE },
    );
  }

  if (!severe && sounds !== 'silent_chest') {
    return {
      severity: 'severe',
      recommendations: recs,
      escalation: 'Senior review — acute asthma exacerbation not responding to initial nebs',
      alertGenerated: true,
    };
  }

  return {
    severity: 'emergency',
    recommendations: recs,
    escalation: 'CALL SENIOR + ICU — severe respiratory distress / silent chest',
    alertGenerated: true,
  };
}

function _pulmonaryEdemaPathway(spo2: number, severe: boolean): ProtocolResult {
  const recs = _commonO2();
  recs.push(
    { action: 'Sit upright with legs dependent — reduces preload', priority: recs.length + 1, rationale: 'Gravity-assisted redistribution of pulmonary blood flow', source: 'ch10-pulmonary-edema-er-ward-rx' },
    { action: 'Furosemide 40-80mg IV stat (double home dose if on chronic loop diuretic)', priority: recs.length + 2, rationale: 'Diuresis reduces pulmonary congestion', source: 'ch10-pulmonary-edema-er-ward-rx' },
    { action: 'GTN 0.5mg SL every 5 min (if SBP > 100 mmHg and no RV infarct concern)', priority: recs.length + 3, rationale: 'Vasodilation reduces preload and afterload', source: 'ch10-pulmonary-edema-er-ward-rx' },
    { action: 'Consider CPAP/BiPAP if available and not improving', priority: recs.length + 4, rationale: 'Positive pressure reduces work of breathing', source: SOURCE },
    { action: 'ECG stat — rule out ACS as cause of acute pulmonary edema', priority: recs.length + 5, rationale: 'Ischemic causes require different management', source: SOURCE },
  );

  if (severe) {
    recs.push(
      { action: 'Morphine 2.5-5mg IV (if not hypotensive) — reduces anxiety and preload', priority: recs.length + 1, rationale: 'Anxiolysis + hemodynamic benefit in severe pulmonary edema', source: 'ch10-pulmonary-edema-er-ward-rx' },
      { action: 'ICU transfer for monitoring and potential non-invasive ventilation', priority: recs.length + 2, rationale: 'Severe pulmonary edema requires intensive monitoring', source: SOURCE },
    );
  }

  return {
    severity: severe ? 'emergency' : 'severe',
    recommendations: recs,
    escalation: severe
      ? 'CALL SENIOR + ICU — severe pulmonary edema with hypoxia'
      : 'Senior review — acute pulmonary edema',
    alertGenerated: true,
  };
}

function _pePathway(spo2: number, severe: boolean): ProtocolResult {
  const recs = _commonO2();
  recs.push(
    { action: 'Assess for PE risk factors (recent surgery, immobilization, pregnancy, OCP, DVT symptoms)', priority: recs.length + 1, rationale: 'Risk stratification for PE', source: 'ch10-pulmonary-embolism-er-ward-rx' },
    { action: 'ECG — look for S1Q3T3 pattern, RV strain, sinus tachycardia', priority: recs.length + 2, rationale: 'ECG signs of right heart strain in PE', source: 'ch10-pulmonary-embolism-er-ward-rx' },
    { action: 'Transthoracic echo — assess RV function', priority: recs.length + 3, rationale: 'RV dysfunction indicates high-risk PE', source: SOURCE },
    { action: 'CTPA (CT pulmonary angiogram) — definitive diagnosis', priority: recs.length + 4, rationale: 'Gold standard for PE diagnosis', source: SOURCE },
    { action: 'Therapeutic LMWH: Enoxaparin 1mg/kg SC BD (if no contraindication)', priority: recs.length + 5, rationale: 'Anticoagulation prevents clot extension', source: 'ch10-pulmonary-embolism-er-ward-rx' },
  );

  if (severe) {
    recs.push(
      { action: 'CALL SENIOR — suspected massive PE with instability', priority: recs.length + 1, rationale: 'Massive PE (hypotension + hypoxia) requires immediate senior input', source: SOURCE },
      { action: 'Consider thrombolysis (Alteplase 50-100mg IV) if confirmed massive PE with shock', priority: recs.length + 2, rationale: 'Life-saving in massive PE', source: SOURCE },
    );
  }

  return {
    severity: severe ? 'emergency' : 'severe',
    recommendations: recs,
    escalation: severe
      ? 'CALL SENIOR — suspected massive PE with shock'
      : 'Cardiology consult — suspected PE, start LMWH while awaiting CTPA',
    alertGenerated: true,
  };
}

function _generalRespiratory(spo2: number, rr: number, severe: boolean): ProtocolResult {
  const recs = _commonO2();
  recs.push(
    { action: 'Assess for pneumothorax (tracheal deviation, hyper-resonance, absent breath sounds)', priority: recs.length + 1, rationale: 'Tension pneumothorax is immediately life-threatening', source: SOURCE },
    { action: 'Focused history: fever, cough, sputum, trauma, aspiration, recent surgery', priority: recs.length + 2, rationale: 'Identify etiology of respiratory distress', source: SOURCE },
    { action: 'Consider antibiotic coverage for community-acquired pneumonia', priority: recs.length + 3, rationale: 'Empiric coverage if infective etiology suspected', source: SOURCE },
    { action: 'Monitor vitals q15min including SpO2, RR, BP, GCS', priority: recs.length + 4, rationale: 'Track trajectory — worsening may require ICU', source: SOURCE },
  );

  return {
    severity: severe ? 'emergency' : 'severe',
    recommendations: recs,
    escalation: 'Senior review — respiratory distress of unclear etiology',
    alertGenerated: true,
  };
}