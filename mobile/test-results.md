# Shift Buddy — Device Test Results

> Companion to the release pipeline. Fill this in for every APK you install.
> **Purpose:** the initial defect diagnosis was wrong because findings weren't logged against a known build.
> Every entry must record the exact build it was tested against.

---

## Test Run — [BUILD TAG] — [DATE]

**Build under test:**
- APK tag / release: `v…` _(e.g. v0.5.0-alpha.1)_
- Source commit: `…`
- Device: _(model, Android version)_
- Tested by: Syed Mohammed Abdul Asha (MO, MICU — SIH Islamabad)
- Setting: _(MICU ward / desk — note connectivity state)_

---

## 1. Install & Launch

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1.1 | APK installs without error | ☐ Pass ☐ Fail | |
| 1.2 | App opens without crash | ☐ Pass ☐ Fail | |
| 1.3 | Protocol/book content is populated (not empty) | ☐ Pass ☐ Fail | |
| 1.4 | Drug formulary is populated | ☐ Pass ☐ Fail | |

**What actually happened:**


---

## 2. Patient CRUD

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 2.1 | Add patient (bed, name, age, sex, diagnosis) | ☐ Pass ☐ Fail | |
| 2.2 | New patient appears in the list **immediately** after saving | ☐ Pass ☐ Fail | regression check — `useFocusEffect` fix |
| 2.3 | Patient detail opens with correct data | ☐ Pass ☐ Fail | |
| 2.4 | Discharge removes patient from the active list | ☐ Pass ☐ Fail | |

**What actually happened:**


---

## 3. 🔴 Persistence (CRITICAL — still unverified)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 3.1 | Add a patient | ☐ Pass ☐ Fail | |
| 3.2 | **Force-close** the app (swipe away from recents) | ☐ Pass ☐ Fail | |
| 3.3 | Reopen — **is the patient still there?** | ☐ Pass ☐ Fail | **this is the key test** |
| 3.4 | Enter vitals, force-close, reopen — vitals still there? | ☐ Pass ☐ Fail | |
| 3.5 | Enter labs, force-close, reopen — labs still there? | ☐ Pass ☐ Fail | |
| 3.6 | Add a medication, force-close, reopen — med still there? | ☐ Pass ☐ Fail | regression check — `saveMedications` fix |
| 3.7 | Reboot the phone, reopen — data still there? | ☐ Pass ☐ Fail | |

**What actually happened:**


---

## 4. Vitals Entry → Alert Firing

| Parameter entered | Value | Alert expected? | Alert appeared? | Severity shown |
|---|---|---|---|---|
| HR | 120 | yes (critical) | ☐ | |
| SBP | 90 | yes (critical) | ☐ | |
| SpO₂ | 94 | warning | ☐ | |
| Temp | 38.5 | warning | ☐ | |
| RR | 28 | ? | ☐ | |

**Notes / unexpected behaviour:**


---

## 5. Labs Entry → Alert Firing

| Lab entered | Value | Alert expected? | Alert appeared? | Protocol link shown |
|---|---|---|---|---|
| K+ | 6.8 | yes — hyperkalaemia | ☐ | |
| Creatinine | 3.2 | yes — AKI staging triggers | ☐ | |
| Blood Sugar | 450 | yes | ☐ | |
| Lactate | 5.0 | yes — sepsis | ☐ | |
| Hb | 6.5 | yes — transfusion | ☐ | |

**Notes / unexpected behaviour:**


---

## 6. Protocol Display

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 6.1 | Critical alert links to the correct protocol | ☐ Pass ☐ Fail | |
| 6.2 | Protocol shows ordered recommendations | ☐ Pass ☐ Fail | |
| 6.3 | Each recommendation cites a source | ☐ Pass ☐ Fail | |
| 6.4 | Escalation instruction is present | ☐ Pass ☐ Fail | |

**What actually happened:**


---

## 7. WhatsApp Handover

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 7.1 | Share opens WhatsApp with pre-filled text | ☐ Pass ☐ Fail | |
| 7.2 | Summary shows correct patient name + bed | ☐ Pass ☐ Fail | |
| 7.3 | Vitals in the summary match entered values | ☐ Pass ☐ Fail | |
| 7.4 | Labs in the summary match entered values | ☐ Pass ☐ Fail | |
| 7.5 | Alerts are reflected in the summary | ☐ Pass ☐ Fail | |
| 7.6 | Text is readable and clinically useful | ☐ Pass ☐ Fail | |

**Paste an actual sent summary here:**


---

## 8. Offline Behaviour

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 8.1 | Enable airplane mode | ☐ Pass ☐ Fail | |
| 8.2 | All of the above still works offline | ☐ Pass ☐ Fail | |
| 8.3 | No spinner waits for network on any clinical action | ☐ Pass ☐ Fail | |

**What actually happened:**


---

## 9. Defects Found

| # | Severity | Description | Steps to reproduce | Still present in this build? |
|---|----------|-------------|--------------------|------------------------------|
| D1 | 🔴 Critical | | | |
| D2 | 🟡 High | | | |
| D3 | 🟢 Low | | | |

---

## 10. Verdict

- [ ] Safe for continued testing
- [ ] Ready for a second HO to try unsupervised
- [ ] Not ready — blocking defect(s): ____

**Summary in one paragraph:**


---

## Run History

| Date | Tag | Tester | Verdict | Blocking defects |
|------|-----|--------|---------|------------------|
| | | | | |
