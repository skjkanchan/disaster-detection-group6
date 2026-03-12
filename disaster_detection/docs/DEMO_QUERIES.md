# Demo Queries – Disaster Assessment Chatbot

Use these 8–10 example queries for capstone demos. Expected behavior is based on `public/data/dummy_predictions.json` (20 records: North/South regions, streets like River Rd, Main St, Oak Ave, Harbor Dr, Beach St, Coastal Hwy).

---

## 1. Address lookup

**Query:** `What's the damage at 501 River Rd?`  
**Expected:** One record: florence_1, major damage, 88% confidence, explanation about roof sections. Answer states address, damage level, and confidence; may include explanation.

**Query:** `Address 202 Oak Ave`  
**Expected:** One record: florence_13, destroyed, 95% confidence. Answer is factual and concise.

**Query:** `Damage at 999 Fake St`  
**Expected:** No records. Response: "No damage record found for address \"999 Fake St\"."

---

## 2. Street lookup

**Query:** `Damage on Main St`  
**Expected:** Multiple records (e.g. florence_5, florence_12, florence_14). Answer summarizes counts by damage level and/or lists severity for that street.

**Query:** `River Rd`  
**Expected:** Records for River Rd (e.g. florence_1, florence_2, florence_11). Summary by damage level.

**Query:** `What about Harbor Dr?`  
**Expected:** Records on Harbor Dr. Summary by severity (minor, major, etc.).

---

## 3. Region summary

**Query:** `Region North summary`  
**Expected:** All records with region North (e.g. 10 records). Counts by damage label (destroyed, major, minor, no damage). No invented numbers.

**Query:** `Damage in South`  
**Expected:** All records in South region (e.g. 10 records). Breakdown by severity.

**Query:** `Summary for North`  
**Expected:** Same as “Region North summary” – totals and severity breakdown for North.

---

## 4. Severity summary

**Query:** `Severity summary`  
**Expected:** Dataset-wide counts by damage level (e.g. 4 destroyed, 6 major, 6 minor, 4 no damage). Factual, from data only.

**Query:** `How many destroyed?`  
**Expected:** Number of “destroyed” records (e.g. 4). May include brief context (e.g. “out of 20 total”).

**Query:** `Breakdown by damage level`  
**Expected:** Same idea as severity summary – counts per label, no hallucination.

---

## 5. Dataset summary

**Query:** `Overall dataset summary`  
**Expected:** Total record count (20), counts by severity, optionally by region. Concise.

**Query:** `How many records in the dataset?`  
**Expected:** Total count (20). May add one sentence on severity or regions.

**Query:** `Full summary`  
**Expected:** Same as overall summary – totals and high-level breakdown.

---

## 6. Top affected areas

**Query:** `Top affected areas`  
**Expected:** List of streets/areas with most damage (e.g. by count or severity). From data only (e.g. Main St, River Rd, Harbor Dr, Beach St, etc.).

**Query:** `Worst areas`  
**Expected:** Similar to top affected – areas with highest damage counts or worst severity.

**Query:** `Critical areas`  
**Expected:** Same intent – top affected / most damaged areas from the dataset.

---

## 7. Unsupported (rejection)

**Query:** `What's the weather?`  
**Expected:** Message that this question type is not supported, and a short list of supported types (address lookup, street lookup, region summary, severity summary, dataset summary, top affected areas).

**Query:** `Tell me a joke`  
**Expected:** Same – unsupported, with list of what is supported.

**Query:** `Random question about politics`  
**Expected:** Rejection and supported-types message.

---

## Quick reference table

| # | Type              | Example query                 | Expected outcome                          |
|---|-------------------|-------------------------------|-------------------------------------------|
| 1 | Address lookup    | Damage at 501 River Rd        | One record: major, 88%, explanation       |
| 2 | Street lookup     | Damage on Main St             | 3 records; summary by severity           |
| 3 | Region summary    | Region North summary          | 10 records; counts by label              |
| 4 | Severity summary  | How many destroyed?          | 4 destroyed (from data)                   |
| 5 | Dataset summary   | Overall dataset summary       | 20 total; breakdown by severity/region   |
| 6 | Top affected      | Top affected areas            | Streets/areas with most damage           |
| 7 | Unsupported       | What's the weather?           | Rejection + supported types               |

Use these for live demos and to verify that the backend only answers from retrieved data and rejects unsupported questions clearly.
