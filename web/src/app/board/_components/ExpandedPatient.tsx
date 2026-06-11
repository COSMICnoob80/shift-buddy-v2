"use client";

import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { getPatient, listVitals, listLabs, listAlerts } from "@/lib/api";
import type { Patient } from "@/lib/api";
import VitalsTab from "./VitalsTab";
import LabsTab from "./LabsTab";
import MedsTab from "./MedsTab";
import AlertsTab from "./AlertsTab";
import ShadowCard from "./ShadowCard";

type TabId = "vitals" | "labs" | "meds" | "alerts";

const TABS: { id: TabId; label: string }[] = [
  { id: "vitals", label: "Vitals" },
  { id: "labs", label: "Labs" },
  { id: "meds", label: "Meds" },
  { id: "alerts", label: "Alerts" },
];

interface ExpandedPatientProps {
  patientId: string;
  onClose: () => void;
  shadowEnabled: boolean;
}

export default function ExpandedPatient({ patientId, onClose, shadowEnabled }: ExpandedPatientProps) {
  const [tab, setTab] = useState<TabId>("vitals");

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: patient } = useSWR<Patient>(
    `patient-${patientId}`,
    () => getPatient(patientId),
  );

  const { data: vitalsData, isLoading: vitalsLoading } = useSWR(
    tab === "vitals" ? `vitals-${patientId}` : null,
    () => listVitals(patientId),
  );

  const { data: labsData, isLoading: labsLoading } = useSWR(
    tab === "labs" ? `labs-${patientId}` : null,
    () => listLabs(patientId),
  );

  const { data: alertsData, isLoading: alertsLoading, mutate: mutateAlerts } = useSWR(
    tab === "alerts" ? `alerts-${patientId}` : null,
    () => listAlerts(patientId, false),
  );

  const handleRefreshAlerts = useCallback(() => {
    void mutateAlerts();
  }, [mutateAlerts]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 40,
        }}
      />

      {/* Slide-up panel */}
      <div
        role="dialog"
        aria-label={patient ? `Patient ${patient.name} details` : "Patient details"}
        aria-modal="true"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-card) var(--radius-card) 0 0",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          transform: "translateY(0)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-4)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "1rem" }}>
              {patient ? patient.name : "Loading…"}
            </div>
            {patient && (
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                Bed {patient.bed_number} · {patient.provisional_diagnosis}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close patient details"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              padding: "0 var(--space-2)",
            }}
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                padding: "var(--space-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: tab === id ? 600 : 400,
                color: tab === id ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderBottom: tab === id ? "2px solid var(--color-accent)" : "2px solid transparent",
                fontFamily: "inherit",
                transition: "color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          role="tabpanel"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4)",
          }}
        >
          {tab === "vitals" && (
            <VitalsTab vitals={vitalsData?.vitals ?? []} isLoading={vitalsLoading} />
          )}
          {tab === "labs" && (
            <LabsTab labs={labsData?.labs ?? []} isLoading={labsLoading} />
          )}
          {tab === "meds" && patient && (
            <MedsTab medications={patient.current_medications} />
          )}
          {tab === "alerts" && (
            <AlertsTab
              alerts={alertsData?.alerts ?? []}
              isLoading={alertsLoading}
              onRefresh={handleRefreshAlerts}
            />
          )}

          <ShadowCard patientId={patientId} enabled={shadowEnabled} />
        </div>
      </div>
    </>
  );
}
