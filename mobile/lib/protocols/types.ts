export interface Recommendation {
  action: string;
  priority: number;
  rationale: string;
  source: string;
}

export interface ProtocolResult {
  severity: string;
  recommendations: Recommendation[];
  escalation: string | null;
  alertGenerated: boolean;
}
