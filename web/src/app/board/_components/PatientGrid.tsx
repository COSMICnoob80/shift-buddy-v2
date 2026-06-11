import type { Alert, Patient } from "@/lib/api";
import PatientCard from "./PatientCard";

interface PatientGridProps {
  patients: Patient[];
  alertsByPatient?: Record<string, Alert>;
  onSelectPatient: (id: string) => void;
}

export default function PatientGrid({ patients, alertsByPatient = {}, onSelectPatient }: PatientGridProps) {
  if (patients.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-12) var(--space-6)",
          color: "var(--color-text-secondary)",
          fontSize: "0.95rem",
        }}
      >
        No admitted patients.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "var(--space-4)",
      }}
      className="patient-grid"
    >
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          lastAlert={alertsByPatient[patient.id]}
          onClick={() => onSelectPatient(patient.id)}
        />
      ))}
    </div>
  );
}
