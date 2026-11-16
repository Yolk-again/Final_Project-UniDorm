# UniDorm Student ID Format

Students must enter their complete, university-issued ten-digit student ID during registration.

| Positions | Meaning | Source |
|---|---|---|
| 1–2 | Admission academic-year code where applicable | Assigned by the university |
| 3–8 | Campus/faculty/programme grouping digits where applicable | Assigned by the university |
| 9–10 | Final two digits of the official student number | Assigned by the university |

**All ten digits are issued by the university.** UniDorm does not generate, allocate, append, or change any part of a student's ID. Students must enter the complete number exactly as shown on their official university records.

The backend validates that the entered value contains exactly ten digits and relies on the existing unique student-ID constraint to prevent duplicate accounts. Existing student accounts and their stored IDs are not modified.

The old `StudentIdSequence` table and migration are retained for compatibility with the already-deployed database, but new registrations no longer read from or write to that table.

## PSU references

- [PSU Phuket student information and cohort references](https://fis.psu.ac.th/en/current-students/)
- [PSU registration instructions confirming a ten-digit student number](https://entrance.trang.psu.ac.th/newstudent/)
- [PSU Phuket new-student information](https://www.psu.ac.th/phuket/freshy65/)
