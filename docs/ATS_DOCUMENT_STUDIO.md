# APPLYVISE AI — ATS DOCUMENT STUDIO SPECIFICATION
**Document Reference:** ADS-2026-v2  
**Components:** `ResumePreviewModal.tsx`, `ResumeStudioTab.tsx`, `docxExtractor.ts`  

---

## 1. Interface Capabilities

The ATS Document Studio is the primary workspace where candidates inspect, review, and export their tailored documents.

Key features:
1. **Side-by-Side Dual View**: Instant switching between ATS Tailored Resume and Tailored Cover Letter.
2. **Dynamic Truthfulness Badge**: Real-time evaluation pill displaying verification status:
   - `Verified ATS Document · 100/100` (Emerald)
   - `ATS Ready · Score/100` (Blue)
   - `Review Dates/Roles · Score/100` (Amber)
   - `Integrity Blocker` (Rose)
3. **Download Protection**: When critical document errors or ungrounded claims are detected, DOCX download is safely disabled, accompanied by an explicit blocker description.
4. **Zero Empty Bullets**: Render loops filter out blank bullets before displaying list items or generating DOCX structures.

---

## 2. DOCX Generator Parity

Both `server/resumeEngine.ts` and `worker/resumeEngine.ts` provide equivalent `generateDocx(profile, tailoredResume)` implementations:
- **Heading 1**: Candidate Full Name (Bold, 18pt)
- **Contact Line**: Email, Phone, Location, LinkedIn
- **Professional Summary**: Left-aligned, 10.5pt, 1.15 line spacing
- **Skills Grid**: Comma-separated or clean grouped spans
- **Experience Blocks**:
  - Top Line: Role (Bold) with right-aligned `exp.period`
  - Sub Line: Company Name (Italic / Accent)
  - Bullets: OpenXML `w:numPr` bullet points with strict non-empty content guards
