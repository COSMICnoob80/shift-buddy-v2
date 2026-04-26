"""T065 RED — Patient Pydantic v2 schema validators.

Exercises: future date_of_admission rejection, whitespace trimming,
enum validation, MedicationSchema routes, PatientPatch empty body,
active_problems item length, and age range bounds.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest


def _today() -> date:
    from datetime import timezone
    from datetime import datetime
    return datetime.now(timezone.utc).date()


def test_future_date_of_admission_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    tomorrow = _today() + timedelta(days=1)
    with pytest.raises(ValidationError, match="date_of_admission"):
        PatientCreate(
            bed_number="ICU-1",
            name="Test Patient",
            age=30,
            sex="male",
            date_of_admission=tomorrow,
            provisional_diagnosis="Test",
            acuity="stable",
            ward="ortho",
        )


def test_today_date_of_admission_accepted() -> None:
    from app.schemas.patient import PatientCreate

    patient = PatientCreate(
        bed_number="ICU-1",
        name="Test Patient",
        age=30,
        sex="male",
        date_of_admission=_today(),
        provisional_diagnosis="Test",
        acuity="stable",
        ward="ortho",
    )
    assert patient.date_of_admission == _today()


def test_name_whitespace_trimmed() -> None:
    from app.schemas.patient import PatientCreate

    patient = PatientCreate(
        bed_number="  ICU-1  ",
        name="  Cook Lateef  ",
        age=30,
        sex="male",
        date_of_admission=_today(),
        provisional_diagnosis="  Right pain  ",
        acuity="stable",
        ward="ortho",
    )
    assert patient.name == "Cook Lateef"
    assert patient.bed_number == "ICU-1"
    assert patient.provisional_diagnosis == "Right pain"


def test_invalid_sex_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=30,
            sex="unknown",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="stable",
            ward="ortho",
        )


def test_invalid_acuity_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=30,
            sex="male",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="very_sick",
            ward="ortho",
        )


def test_invalid_ward_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=30,
            sex="male",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="stable",
            ward="moon_base",
        )


def test_medication_all_routes_valid() -> None:
    from app.schemas.patient import MedicationSchema

    routes = ["iv", "im", "sc", "po", "pr", "nebulized", "topical", "sublingual"]
    for route in routes:
        med = MedicationSchema(
            name="Test Med",
            dose="40mg",
            route=route,
            frequency="OD",
            start_date="2026-01-01",
        )
        assert med.route == route


def test_medication_invalid_route_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import MedicationSchema

    with pytest.raises(ValidationError):
        MedicationSchema(
            name="Test Med",
            dose="40mg",
            route="oral",
            frequency="OD",
            start_date="2026-01-01",
        )


def test_patient_patch_empty_body_valid() -> None:
    from app.schemas.patient import PatientPatch

    patch = PatientPatch()
    assert patch.model_dump(exclude_unset=True) == {}


def test_active_problems_item_too_long_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    long_problem = "x" * 201
    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=30,
            sex="male",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="stable",
            ward="ortho",
            active_problems=[long_problem],
        )


def test_age_below_zero_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=-1,
            sex="male",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="stable",
            ward="ortho",
        )


def test_age_above_150_rejected() -> None:
    from pydantic import ValidationError

    from app.schemas.patient import PatientCreate

    with pytest.raises(ValidationError):
        PatientCreate(
            bed_number="1",
            name="Test",
            age=151,
            sex="male",
            date_of_admission=_today(),
            provisional_diagnosis="Test",
            acuity="stable",
            ward="ortho",
        )


def test_bed_number_accepted() -> None:
    from app.schemas.patient import PatientCreate

    patient = PatientCreate(
        bed_number="ICU-3",
        name="Test Patient",
        age=45,
        sex="female",
        date_of_admission=_today(),
        provisional_diagnosis="Test",
        acuity="critical",
        ward="emergency",
    )
    assert patient.bed_number == "ICU-3"
