"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import AppShell from "@/components/AppShell";
import { getToken } from "@/lib/session";
import { listPatients } from "@/lib/api";
import type { PatientListResponse } from "@/lib/api";
import SummaryBar from "./_components/SummaryBar";
import PatientGrid from "./_components/PatientGrid";
import ExpandedPatient from "./_components/ExpandedPatient";
import { Suspense } from "react";

const SHADOW_ENABLED = process.env["NEXT_PUBLIC_FEATURE_SHADOW_SUGGEST"] === "true";
const POLL_MS = 30_000;

function BoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPatientId = searchParams.get("patient");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const { data, isLoading } = useSWR<PatientListResponse>(
    "board-patients",
    () => listPatients({ status: "admitted", sort: "acuity" }),
    { refreshInterval: POLL_MS },
  );

  const handleSelectPatient = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("patient", id);
      router.push(`/board?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleClosePatient = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("patient");
    const qs = params.toString();
    router.push(qs ? `/board?${qs}` : "/board", { scroll: false });
  }, [router, searchParams]);

  if (isLoading && !data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          color: "var(--color-text-secondary)",
          fontSize: "0.875rem",
        }}
      >
        Loading patients…
      </div>
    );
  }

  const patients = data?.patients ?? [];
  const summary = data?.summary ?? { total: 0, critical: 0, urgent: 0, stable: 0, discharge_ready: 0 };

  return (
    <>
      <SummaryBar summary={summary} />
      <PatientGrid
        patients={patients}
        onSelectPatient={handleSelectPatient}
      />
      {selectedPatientId && (
        <ExpandedPatient
          patientId={selectedPatientId}
          onClose={handleClosePatient}
          shadowEnabled={SHADOW_ENABLED}
        />
      )}
    </>
  );
}

export default function BoardPage() {
  return (
    <AppShell userLabel="House Officer">
      <Suspense
        fallback={
          <div style={{ padding: "var(--space-6)", color: "var(--color-text-secondary)" }}>
            Loading…
          </div>
        }
      >
        <BoardContent />
      </Suspense>
    </AppShell>
  );
}
