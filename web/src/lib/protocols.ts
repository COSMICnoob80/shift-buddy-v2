export interface ProtocolTier {
  label: string;
  range: string;
  actions: string[];
}

export interface ProtocolData {
  name: string;
  description: string;
  tiers: ProtocolTier[];
  escalation: string;
  source: string;
}

export const PROTOCOL_NAMES = ["hyperkalemia", "aki_staging", "dka"] as const;
export type ProtocolName = (typeof PROTOCOL_NAMES)[number];

export const PROTOCOL_DESCRIPTIONS: Record<ProtocolName, string> = {
  hyperkalemia: "Hyperkalemia management (AHA 2023 / KDIGO 2023)",
  aki_staging: "AKI staging by KDIGO 2023 creatinine criteria",
  dka: "Diabetic Ketoacidosis severity and management",
};

export async function loadProtocol(name: ProtocolName): Promise<ProtocolData> {
  const res = await fetch(`/protocols/${name}.json`);
  if (!res.ok) throw new Error(`Protocol not found: ${name}`);
  return res.json() as Promise<ProtocolData>;
}
