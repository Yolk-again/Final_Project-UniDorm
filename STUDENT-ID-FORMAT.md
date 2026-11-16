# UniDorm Student ID Format

Students must enter their complete, university-issued ten-digit PSU student ID during registration.

| Positions | Meaning | Source |
|---|---|---|
| 1–2 | Admission-year code used by the student's ID | Assigned by PSU |
| 3–8 | Campus, faculty, and programme grouping digits where applicable | Assigned by PSU |
| 9–10 | Remaining digits of the official student number | Assigned by PSU |

**All ten digits are university-issued.** UniDorm does not generate, allocate, append, or change any part of a student's ID. The registration form accepts students from every PSU campus and programme. It does not hard-code Phuket Campus, Digital Engineering, or any other campus/faculty/programme code.

## Registration checks

The registration form and backend both check student IDs for common input mistakes:

1. The value must contain exactly ten digits.
2. It rejects a value made of the same digit repeated ten times.
3. It rejects obvious ascending or descending ten-digit sequences.
4. It checks the first two digits for an admission-year code that appears to be 2–15 years in the future, using the current Thai Buddhist Era year. Current-year and next-year codes are allowed.
5. The database's unique constraint rejects an ID that already belongs to another account.

There is deliberately no minimum admission-year limit and no campus/programme-code allowlist. This avoids rejecting continuing students with older IDs or students from other PSU campuses and programmes.

These checks detect suspicious formatting; **they cannot confirm that a number belongs to a real PSU student**. UniDorm does not currently query a live PSU student-record verification service. Students must compare the ID with their official PSU student record. An administrator should verify student eligibility through the university's normal process when required.

Existing student accounts and stored IDs are not modified. The stricter suspicious-pattern checks apply to new registrations; existing students can continue logging in with their stored ten-digit IDs.

The old `StudentIdSequence` table and migration are retained for compatibility with the already-deployed database, but new registrations no longer read from or write to that table.

## PSU references

- [PSU Phuket student information and cohort references](https://fis.psu.ac.th/en/current-students/)
- [PSU Trang registration instructions confirming a ten-digit student number](https://entrance.trang.psu.ac.th/newstudent/)
- [PSU Registrar's Division student-ID information](https://reg.psu.ac.th/faq/)
