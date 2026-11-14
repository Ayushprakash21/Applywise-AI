# ApplyVise AI — LibreTranslate & Argos Translate Licensing Review

**Review Date:** November 2026  
**License Type:** GNU Affero General Public License v3.0 (AGPL-3.0)  
**Reviewed Components:** LibreTranslate Engine, Argos Translate Models

---

## 1. AGPL-3.0 Architectural Isolation Boundary

LibreTranslate is licensed under the AGPL-3.0 license. Under Section 13 of the AGPL, modifying the software and offering it as a network service requires making the corresponding source code available.

To maintain commercial platform independence and full legal compliance:
1. **Network Boundary Isolation:**
   - LibreTranslate runs as an unmodified, standalone containerized service behind standard HTTP REST API endpoints (`/translate`, `/languages`, `/detect`).
   - ApplyVise backend code (`server.ts`, `worker/index.ts`) communicates with LibreTranslate purely as a standard HTTP client over TCP/IP sockets.
2. **Zero In-Process Linking:**
   - ApplyVise does NOT link, import, or bundle LibreTranslate or Argos Translate Python source code into its Node.js, Cloudflare Worker, or React frontend runtimes.
   - The application does not modify the LibreTranslate engine itself.
3. **Open-Source Attribution & Notices:**
   - ApplyVise includes all required copyright notices, license disclosures, and credits in platform documentation and open-source compliance matrices.
