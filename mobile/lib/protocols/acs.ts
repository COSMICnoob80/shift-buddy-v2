/**
 * ACS/STEMI protocol — deterministic triage and management.
 * Source: Doctor On Duty 2021 (ch10-acs-er-ward-rx, ch10-acute-chest-pain-acs-er-ward-rx,
 *                                 ch10-acute-myocardial-infarction-er-ward-rx)
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'ACS Management (AHA/ACC 2023 / Doctor On Duty 2021)';

type EcgType = 'normal' | 'stemi' | 'nstemi' | 'unknown';

export function evaluate(
  ecg: EcgType,
  troponinRaised: boolean,
  chestPainOngoing: boolean,
  onsetHours: number,
): ProtocolResult {
  const mona = _monaRecs(chestPainOngoing);

  if (ecg === 'stemi') {
    if (onsetHours <= 12) {
      return _stemiAcute(mona, onsetHours);
    }
    return _stemiLate(mona);
  }

  if (ecg === 'nstemi' || (ecg === 'normal' && troponinRaised)) {
    return _nstemi(mona);
  }

  if (ecg === 'normal' && !troponinRaised && chestPainOngoing) {
    return _unstableAngina(mona);
  }

  return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
}

function _monaRecs(chestPainOngoing: boolean): Recommendation[] {
  const recs: Recommendation[] = [
    { action: 'Aspirin 300mg chewed stat', priority: 1, rationale: 'Antiplatelet — reduces mortality in ALL ACS', source: SOURCE },
    { action: 'ECG within 10 min of presentation', priority: 2, rationale: 'Critical for STEMI vs NSTEMI differentiation', source: SOURCE },
    { action: 'Cardiac troponin (hs-cTn) STAT and at 3 hours', priority: 3, rationale: 'Confirm myocardial injury', source: SOURCE },
  ];
  if (chestPainOngoing) {
    recs.push(
      { action: 'Morphine 2.5-5mg IV (if pain not relieved by GTN)', priority: 4, rationale: 'Pain control reduces sympathetic drive', source: SOURCE },
      { action: 'Oxygen via nasal cannula if SpO2 < 94%', priority: 5, rationale: 'Maintain oxygenation', source: SOURCE },
      { action: 'GTN (Nitroglycerin) 0.5mg SL every 5 min up to 3 doses (if SBP > 90 mmHg, no RV infarct)', priority: 6, rationale: 'Vasodilation — reduces preload and pain', source: SOURCE },
    );
  }
  return recs;
}

function _stemiAcute(mona: Recommendation[], onsetHours: number): ProtocolResult {
  const recs = [...mona];
  recs.push(
    { action: 'STEMI confirmed — assess for reperfusion', priority: recs.length + 1, rationale: `Onset within ${onsetHours}h — eligible for reperfusion`, source: SOURCE },
    { action: 'If PCI-capable center within 120 min → activate cath lab for primary PCI', priority: recs.length + 2, rationale: 'Gold standard — PCI preferred over thrombolysis', source: SOURCE },
    { action: 'If PCI not available within 120 min → Thrombolysis (Streptokinase 1.5 MU IV over 60 min)', priority: recs.length + 3, rationale: 'Fibrinolytic therapy reduces mortality if given early', source: SOURCE },
    { action: 'Check thrombolysis contraindications: active bleeding, recent surgery (<2wk), stroke <3mo, severe HTN', priority: recs.length + 4, rationale: 'Safety screening before thrombolysis', source: SOURCE },
    { action: 'Heparin infusion (UFH) or LMWH (Enoxaparin 1mg/kg SC BD)', priority: recs.length + 5, rationale: 'Anticoagulation for ACS', source: SOURCE },
    { action: 'Clopidogrel 300mg loading dose (or Ticagrelor 180mg)', priority: recs.length + 6, rationale: 'Dual antiplatelet therapy', source: SOURCE },
    { action: 'Atorvastatin 80mg stat', priority: recs.length + 7, rationale: 'High-intensity statin — plaque stabilization', source: SOURCE },
    { action: 'Beta-blocker (e.g., Metoprolol 25-50mg PO) if no contraindication', priority: recs.length + 8, rationale: 'Reduce myocardial oxygen demand', source: SOURCE },
  );
  return {
    severity: 'emergency',
    recommendations: recs,
    escalation: 'CALL SENIOR + Cardiology consult — STEMI, activate reperfusion pathway',
    alertGenerated: true,
  };
}

function _stemiLate(mona: Recommendation[]): ProtocolResult {
  const recs = [...mona];
  recs.push(
    { action: 'STEMI confirmed but beyond 12h window — medical management only', priority: recs.length + 1, rationale: 'Late presentation >12h — thrombolysis not indicated unless ongoing chest pain', source: SOURCE },
    { action: 'DAPT (Aspirin + Clopidogrel/Ticagrelor)', priority: recs.length + 2, rationale: 'Ongoing secondary prevention', source: SOURCE },
    { action: 'Anticoagulation (Enoxaparin 1mg/kg SC BD)', priority: recs.length + 3, rationale: 'Prevent extension of thrombus', source: SOURCE },
    { action: 'Atorvastatin 80mg daily', priority: recs.length + 4, rationale: 'High-intensity statin', source: SOURCE },
    { action: 'Cardiology consult for risk stratification and delayed PCI consideration', priority: recs.length + 5, rationale: 'May still benefit from intervention', source: SOURCE },
  );
  return {
    severity: 'severe',
    recommendations: recs,
    escalation: 'Cardiology consult — late-presenting STEMI (>12h)',
    alertGenerated: true,
  };
}

function _nstemi(mona: Recommendation[]): ProtocolResult {
  const recs = [...mona];
  recs.push(
    { action: 'Dual antiplatelet: Aspirin 300mg + Clopidogrel 300mg (or Ticagrelor 180mg)', priority: recs.length + 1, rationale: 'NSTEMI — aggressive antiplatelet', source: SOURCE },
    { action: 'Anticoagulation: Enoxaparin 1mg/kg SC BD or Heparin drip', priority: recs.length + 2, rationale: 'Prevent thrombus progression', source: SOURCE },
    { action: 'Atorvastatin 80mg stat', priority: recs.length + 3, rationale: 'High-intensity statin', source: SOURCE },
    { action: 'Beta-blocker (Metoprolol 25-50mg PO) if no contraindication', priority: recs.length + 4, rationale: 'Reduce cardiac workload', source: SOURCE },
    { action: 'Admit to CCU/cardiac step-down for monitoring', priority: recs.length + 5, rationale: 'Risk of arrhythmia and progression to STEMI', source: SOURCE },
    { action: 'Cardiology consult for early invasive strategy <24h', priority: recs.length + 6, rationale: 'Early angiography indicated for high-risk NSTEMI', source: SOURCE },
  );
  return {
    severity: 'severe',
    recommendations: recs,
    escalation: 'Cardiology consult — NSTEMI, admit for monitoring and early invasive strategy',
    alertGenerated: true,
  };
}

function _unstableAngina(mona: Recommendation[]): ProtocolResult {
  const recs = [...mona];
  recs.push(
    { action: 'Dual antiplatelet: Aspirin 300mg + Clopidogrel 300mg', priority: recs.length + 1, rationale: 'Unstable angina — acute coronary syndrome equivalent', source: SOURCE },
    { action: 'Anticoagulation: Enoxaparin 1mg/kg SC BD', priority: recs.length + 2, rationale: 'Prevent progression', source: SOURCE },
    { action: 'GTN PRN for chest pain (SL or IV infusion)', priority: recs.length + 3, rationale: 'Symptom relief', source: SOURCE },
    { action: 'Risk stratify: GRACE score, echocardiogram', priority: recs.length + 4, rationale: 'Determine need for early invasive strategy', source: SOURCE },
  );
  return {
    severity: 'moderate',
    recommendations: recs,
    escalation: null,
    alertGenerated: true,
  };
}