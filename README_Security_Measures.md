# Security Measures (OWASP Top 10 Mapping)

This project has been developed with a "Security by Design" approach, ensuring that critical vulnerabilities are mitigated natively within the application's core architecture. The following document maps the project's security implementations directly to the **OWASP Top 10 (2021)** web application security risks.

---

## 🛡️ OWASP Top 10 Mapping

### A01:2021 - Broken Access Control
Access control ensures that users act only within their intended permissions.
- **Role-Based Access Control (RBAC):** Utilizing NestJS `@Roles()` decorators and custom `RolesGuard` to strict-check authorization. Endpoints are context-aware (e.g., an Employee cannot view other departments' leaves unless they hold a Manager/Admin role).
- **Service-Level Verification:** Object-level authorization checks are explicitly handled in the `LeavesService`. For example, employees are strictly enforced to only `update` or `remove` their own leave requests, and actions are blocked if the status is not `pending`.
- **CORS Configuration:** Strictly configured in `main.ts` with defined `origin` targets mapping to specific frontend URLs alongside `credentials: true`. 

### A02:2021 - Cryptographic Failures
Protecting sensitive data at rest and in transit.
- **Password Hashing:** Passwords are never stored in plaintext. They are mathematically dispersed using **Argon2**, an award-winning highly secure key derivation function over older methods like bcrypt.
- **2FA / MFA Support:** Multi-factor authentication mechanisms are integrated using `otplib` and `qrcode` to provide Time-based One-Time Passwords (TOTP). This mitigates risks in credential stuffing or stolen passwords.
- **JWT Standard:** Industry-standard JSON Web Tokens (JWT) are cryptographically signed using secure secrets (`@nestjs/jwt`), preventing payload manipulation in transit.

### A03:2021 - Injection (Including XSS)
Preventing malicious input execution in interpreters (SQL, NoSQL, OS, LDAP, browser).
- **ORM-based Data Mapping:** Direct database queries are restricted. The project leverages **Prisma**, which acts automatically limits and sanitizes query parameter bindings, vastly neutralizing SQL Injection risks.
- **Cross-Site Scripting (XSS) Sanitization:** All subjective text inputs (e.g., Leave Reasons) process through the `sanitize-html` engine. Configured tightly with `{ allowedTags: [], allowedAttributes: {} }` mapped in services, enforcing text purity before reaching the database.

### A04:2021 - Insecure Design
Using architectural designs that mitigate risk early.
- **Validation Pipeline Setup:** Through `class-validator`, the global `ValidationPipe` maps DTOs structurally. Crucially, `{ whitelist: true }` is enabled to automatically strip out unregistered/unexpected parameters sent by attackers.
- **Strict Decoupling:** The project is strictly decoupled (NestJS REST Backend, separated React/Vite Frontend), establishing clear security boundaries where the frontend interacts entirely via declarative API rather than server-rendered template injection vulnerabilities.

### A05:2021 - Security Misconfiguration
Avoiding defaults, hardening configs, and securely managing the environment.
- **Environment Management:** Hardcoded secrets are banished. `@nestjs/config` drives configuration behavior entirely through isolated `.env` environments context.
- **NestJS Defaults:** Leveraging NestJS structure natively prevents common misconfigurations, maintaining strong isolation logic out-of-the-box. 

### A06:2021 - Vulnerable and Outdated Components
Maintaining current definitions and supported stacks.
- **Modern Lifecycle:** Built heavily upon Nest 11 and React 19 foundations, heavily reducing vulnerabilities associated with legacy code snippets and deeply nested dependencies. Managed systematically through `package-lock.json`.

### A07:2021 - Identification and Authentication Failures
Confirming user identities reliably.
- **OAuth 2.0 Integration:** Using `passport-google-oauth20` establishes a trusted delegation layer for Enterprise identity validation instead of manual registrations alone.
- **Guarded Tokens:** Passport.js and `passport-jwt` coordinate stateless identification. Tokens are delivered securely and handled dynamically with Cookie configurations mapping to `cookie-parser`.

### A08:2021 - Software and Data Integrity Failures
Ensuring that data comes from a trusted origin without manipulation.
- **Entity State Logic Constraints:** Approvals explicitly use Transactions (`$transaction`) in Prisma (see `LeavesService.updateStatus`). For instance, quota adjustments and leave approvals lock simultaneously ensuring concurrency doesn't destroy data integrity.

### A09:2021 - Security Logging and Monitoring Failures
Visibility into application events and active breach attempts.
- **Comprehensive Audit Log:** Deep implementation of an internal `AuditService`. Critical mutations (`CREATE`, `UPDATE`, `UPDATE_STATUS`, `DELETE`) are extensively monitored. Approver emails, specific document IDs, and actor emails are immediately preserved tracking chain of responsibility.

### A10:2021 - Server-Side Request Forgery (SSRF)
Preventing the server from executing unintended URI requests.
- **External URL Scoping:** The scope of external routing is entirely limited strictly to trusted Identity Providers (like Google via Passport). Payload inputs containing URLs do not trigger backend HTML interpretation or fetching. 
