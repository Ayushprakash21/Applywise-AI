# APPLYVISE AI — POST-DEPLOYMENT SMOKE TESTS

Execute these verification checks immediately following any deployment to confirm system health.

---

## 1. AUTOMATED HTTP HEALTH SMOKE TESTS

### 1.1 Edge Health Endpoint
```bash
curl.exe -s -i https://applyvise-ai.ayushprakash0021.workers.dev/api/health
```
- **Expected Status:** `HTTP/1.1 200 OK`
- **Expected Payload:**
  ```json
  {"status":"ok","product":"ApplyVise AI","timestamp":"..."}
  ```

### 1.2 Location Intelligence & Dropdown API
```bash
curl.exe -s -i "https://applyvise-ai.ayushprakash0021.workers.dev/api/locations/search?q=indore"
```
- **Expected Status:** `HTTP/1.1 200 OK`
- **Expected Payload:** Contains structured location object:
  ```json
  {"success":true,"query":"indore","results":[{"city":"Indore","region":"Madhya Pradesh","country":"India", ...}]}
  ```

### 1.3 Platform Options Catalog
```bash
curl.exe -s -i https://applyvise-ai.ayushprakash0021.workers.dev/api/options/catalog
```
- **Expected Status:** `HTTP/1.1 200 OK`
- **Expected Payload:** Returns currencies, work arrangements, industries, and employment types.

---

## 2. CRITICAL USER WORKFLOW SMOKE TESTS (MANUAL / BROWSER)

1. **User Registration & Login:**
   - Navigate to `/login`.
   - Register a test account (`test_candidate@applyvise.local`).
   - Confirm session persists across tab refresh.

2. **Resume Upload (DOCX & PDF):**
   - Navigate to Career Profile / Resume Intelligence.
   - Upload both a PDF and a DOCX resume.
   - Confirm that profile extraction processes without "Could not find file in options" error.
   - Confirm employment records, titles, and dates are separated accurately without 2022-Present hallucination.

3. **Global Dropdown Cascading:**
   - In Career Profile, type "indore" in Location.
   - Select "Indore, Madhya Pradesh, India" from suggestions.
   - Verify selection persists on page save/refresh.

4. **Opportunity Radar & GCDE:**
   - Open Opportunity Radar (`/radar`).
   - Verify job vacancies load from database/cache.
   - Open 3D Opportunity Universe and verify smooth WebGL rendering with accessible toggle.

5. **Admin Console Security:**
   - Log in as an administrator.
   - Open `/admin`.
   - Verify KPI counts reflect database records.
   - Attempt to access `/admin` with a standard candidate session to verify HTTP 403 Forbidden.
