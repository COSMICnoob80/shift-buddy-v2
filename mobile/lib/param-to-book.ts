/**
 * Maps deranged lab/vital parameters to relevant Doctor On Duty book sections.
 * Deterministic lookup — no AI involved.
 *
 * Each entry maps a parameter name to section IDs from doctor-on-duty-full.json.
 * Sections are shown as "Read more from Doctor On Duty" in the patient detail.
 *
 * Engine Priority — parameters covered by deterministic protocol engines:
 *   K+              → hyperkalemia.ts (primary), book fallback
 *   blood_sugar     → dka.ts / hypoglycemia.ts (primary), book fallback
 *   creatinine      → aki_staging.ts (primary), book fallback
 *   spo2, rr        → respiratory.ts (primary), book fallback
 *   heart_rate      → acs.ts (primary), book fallback
 *   systolic_bp     → anaphylaxis.ts (primary), book fallback
 * All others        → book only (no engine yet)
 */

export interface ParameterBookRef {
  sectionId: string;
  label: string;
}

const MAPPINGS: Record<string, ParameterBookRef[]> = {
  K_: [
    { sectionId: 'ch10-hyperkalemia-er-ward-rx', label: 'Hyperkalemia Management' },
    { sectionId: 'ch10-hypokalemia-er-ward-rx', label: 'Hypokalemia Management' },
  ],
creatinine: [
    { sectionId: 'ch10-acute-kidney-injury-er-ward-rx', label: 'AKI / Renal Management' },
  ],
  blood_sugar: [
    { sectionId: 'ch10-diabetic-ketoacidosis-dka-er-rx', label: 'DKA Protocol' },
    { sectionId: 'ch10-hypoglycemia-er-ward-rx', label: 'Hypoglycemia Management' },
  ],
  heart_rate: [
    { sectionId: 'ch10-cardiac-arrest-er-ward-rx', label: 'Cardiac Arrest Protocol' },
    { sectionId: 'ch10-acute-chest-pain-acute-coronary-syndrome-er-ward-rx', label: 'ACS Management' },
    { sectionId: 'ch10-fever-with-aloc-altered-level-of-consciousness-er-ward-', label: 'Fever / Infection Workup' },
    { sectionId: 'ch10-acute-blood-loss-hemorrhagic-shock-er-rx', label: 'Hemorrhagic Shock' },
  ],
  systolic_bp: [
    { sectionId: 'ch10-hypertensive-emergency-management', label: 'Hypertensive Emergency' },
    { sectionId: 'ch10-acute-blood-loss-hemorrhagic-shock-er-rx', label: 'Hemorrhagic Shock' },
    { sectionId: 'ch10-anaphylaxis-er-ward-rx', label: 'Anaphylaxis / Shock' },
  ],
  diastolic_bp: [
    { sectionId: 'ch10-hypertensive-emergency-management', label: 'Hypertensive Emergency' },
  ],
  temperature: [
    { sectionId: 'ch10-fever-with-aloc-altered-level-of-consciousness-er-ward-', label: 'Fever with ALOC' },
    { sectionId: 'ch5-malaria-fever-rx', label: 'Malaria Fever' },
    { sectionId: 'ch5-fever-with-chills-and-rigors-rx', label: 'Fever Workup' },
  ],
  spo2: [
    { sectionId: 'ch10-acute-asthma-er-rx', label: 'Acute Asthma' },
    { sectionId: 'ch10-status-asthmaticus-er-rx', label: 'Status Asthmaticus' },
    { sectionId: 'ch10-acute-exacerbation-of-copd-aecopd-er-rx', label: 'AECOPD' },
    { sectionId: 'ch10-pulmonary-edema-er-ward-rx', label: 'Pulmonary Edema' },
    { sectionId: 'ch10-pulmonary-embolism-er-ward-rx', label: 'Pulmonary Embolism' },
  ],
  respiratory_rate: [
    { sectionId: 'ch10-acute-asthma-er-rx', label: 'Acute Asthma' },
    { sectionId: 'ch10-acute-exacerbation-of-copd-aecopd-er-rx', label: 'AECOPD' },
    { sectionId: 'ch10-pulmonary-edema-er-ward-rx', label: 'Pulmonary Edema' },
  ],
  gcs: [
    { sectionId: 'ch10-evaluation-and-management-of-coma-in-er', label: 'Coma Evaluation' },
    { sectionId: 'ch10-traumatic-brain-injury-er-ward-protocol', label: 'TBI Protocol' },
    { sectionId: 'ch10-ischaemic-stroke-er-ward-rx', label: 'Stroke Management' },
  ],
  urine_output: [
    { sectionId: 'ch10-acute-kidney-injury-er-ward-rx', label: 'AKI / Renal Management' },
  ],
  hb: [
    { sectionId: 'ch10-iron-deficiency-anemia-er-ward-rx', label: 'Anemia Management' },
    { sectionId: 'ch10-megaloblastic-anemia-er-ward-rx', label: 'Megaloblastic Anemia' },
    { sectionId: 'ch10-aplastic-anemia-er-ward-rx', label: 'Aplastic Anemia' },
    { sectionId: 'ch10-acute-blood-loss-hemorrhagic-shock-er-rx', label: 'Hemorrhagic Shock' },
  ],
  hemoglobin: [
    { sectionId: 'ch10-iron-deficiency-anemia-er-ward-rx', label: 'Anemia Management' },
    { sectionId: 'ch10-megaloblastic-anemia-er-ward-rx', label: 'Megaloblastic Anemia' },
    { sectionId: 'ch10-aplastic-anemia-er-ward-rx', label: 'Aplastic Anemia' },
    { sectionId: 'ch10-acute-blood-loss-hemorrhagic-shock-er-rx', label: 'Hemorrhagic Shock' },
  ],
  platelets: [
    { sectionId: 'ch10-dengue-fever-with-severe-progressive-thrombocytopenia-e', label: 'Dengue / Thrombocytopenia' },
    { sectionId: 'ch10-thrombotic-thrombocytopenic-purpura-ttp-er-ward-rx', label: 'TTP' },
    { sectionId: 'ch10-aplastic-anemia-er-ward-rx', label: 'Aplastic Anemia' },
    { sectionId: 'ch10-acute-leukemia-er-ward-rx-initial-management', label: 'Acute Leukemia' },
  ],
plt: [
    { sectionId: 'ch10-dengue-fever-with-severe-progressive-thrombocytopenia-e', label: 'Dengue / Thrombocytopenia' },
    { sectionId: 'ch10-thrombotic-thrombocytopenic-purpura-ttp-er-ward-rx', label: 'TTP' },
    { sectionId: 'ch10-aplastic-anemia-er-ward-rx', label: 'Aplastic Anemia' },
    { sectionId: 'ch10-acute-leukemia-er-ward-rx-initial-management', label: 'Acute Leukemia' },
  ],
  wbc: [
    { sectionId: 'ch10-fever-with-aloc-altered-level-of-consciousness-er-ward-', label: 'Fever / Infection Workup' },
    { sectionId: 'ch10-acute-leukemia-er-ward-rx-initial-management', label: 'Acute Leukemia' },
    { sectionId: 'ch10-aplastic-anemia-er-ward-rx', label: 'Aplastic Anemia' },
  ],
  troponin: [
    { sectionId: 'ch10-acute-chest-pain-acute-coronary-syndrome-er-ward-rx', label: 'ACS / Chest Pain' },
    { sectionId: 'ch10-acute-myocardial-infarction-er-ward-rx', label: 'Acute MI' },
    { sectionId: 'ch10-pulmonary-embolism-er-ward-rx', label: 'Pulmonary Embolism' },
  ],
  lactate: [
    { sectionId: 'ch10-acute-blood-loss-hemorrhagic-shock-er-rx', label: 'Hemorrhagic Shock' },
    { sectionId: 'ch10-acute-haemolytic-transfusion-reaction-er-rx', label: 'Acute Transfusion Reaction' },
  ],
  sodium: [
    { sectionId: 'ch10-evaluation-and-management-of-coma-in-er', label: 'Electrolyte / Coma' },
  ],
  na: [
    { sectionId: 'ch10-evaluation-and-management-of-coma-in-er', label: 'Electrolyte / Coma' },
  ],
  bicarbonate: [
    { sectionId: 'ch10-diabetic-ketoacidosis-dka-er-rx', label: 'DKA Protocol' },
  ],
  hco3: [
    { sectionId: 'ch10-diabetic-ketoacidosis-dka-er-rx', label: 'DKA Protocol' },
  ],
  ph: [
    { sectionId: 'ch10-diabetic-ketoacidosis-dka-er-rx', label: 'DKA Protocol' },
  ],
};

/** Map a known vitals/labs parameter name to matching book section refs. */
export function getBookRefs(parameter: string): ParameterBookRef[] {
  return MAPPINGS[parameter] ?? [];
}

/** Check if a parameter has any linked book content. */
export function hasBookContent(parameter: string): boolean {
  return parameter in MAPPINGS;
}