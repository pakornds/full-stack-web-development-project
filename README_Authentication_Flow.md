# Authentication Flow Documentation

This document outlines the authentication operations and flows implemented across the application. The system primarily relies on **stateless JSON Web Tokens (JWT)** securely delivered via **HttpOnly cookies**, backed by **Role-Based Access Control (RBAC)** and **Two-Factor Authentication (TOTP 2FA)**.

---

## 🏗️ Core Mechanisms
- **`jwt` (Access Token):** Short-lived token used for validating route access. Valid for 15 minutes. Set as `httpOnly`, `secure` (in production), `sameSite='lax'`, `path='/'`.
- **`refreshToken`:** Long-lived token used solely to issue new `jwt` tokens upon expiration. Valid for 7 days. Restricted via `path='/auth'`.
- **Cryptography:** Passwords secured with `argon2`. TOTP operates via `otplib`.

---

## 🔄 Authentication Flows

### 1. Traditional Email/Password Login
1. **Client Action:** Submits `email` and `password` to `POST /auth/login`.
2. **Server Action:** Validates credentials against hashed passwords in the database.
3. **2FA Check:**
   - **If 2FA is DISABLED:** Server sets `jwt` and `refreshToken` as secure HttpOnly cookies and responds `200 OK`. Flow finishes.
   - **If 2FA is ENABLED:** Server bypasses cookie creation and instead returns `{ requiresTwoFactor: true, tempToken: "xxxx" }`.

### 2. Two-Factor Authentication (2FA) Login
1. **Client Action (Pending 2FA):** Receives the `tempToken` from the initial login step. User inputs the 6-digit TOTP code from their authenticator app.
2. **Submission:** Submits `code` and `tempToken` to `POST /auth/2fa/verify-login`.
3. **Server Action:** Validates the temporary token and confirms the TOTP code. Upon success, real `jwt` and `refreshToken` HttpOnly cookies are finally set. 

### 3. Google OAuth 2.0 Registration/Login
1. **Initiation:** User navigates to `GET /auth/google`. Server redirects to Google's consent screen.
2. **Callback:** Google redirects back to `GET /auth/google/callback` with profile scopes.
3. **Processing:**
   - Auth Guard seamlessly pulls `email` and `name`. 
   - Server registers a new user if they don't exist, or logs them in if they do.
   - Server issues the internal `jwt` and `refreshToken` HttpOnly cookies dynamically.
4. **Redirection:** Server initiates a 302 redirect sending the user automatically to the frontend `/dashboard/personal`.

### 4. Registration Process
1. **Submission:** User data (Name, Email, Password, Department Data) sent to `POST /auth/register`.
2. **Creation:** Automatically creates User (Role defaults gracefully).
3. **Persistence:** `jwt` and `refreshToken` are directly set so the user is immediately logged in upon successful registration.

---

## 🛡️ Session Lifecycle Management

### Token Refreshing (Silent Session Renewal)
1. When the `jwt` expires (15 mins), frontend interactions seamlessly fail with `401 Unauthorized`.
2. The frontend interceptor implicitly hits `POST /auth/refresh`.
3. The server reads the existing `refreshToken` cookie.
4. **Rotation:** If valid, the server returns a new `jwt` and rotates the `refreshToken` issuing a fresh set of HttpOnly cookies to keep the session alive.

### Logout Process
1. User requests `GET /auth/logout`.
2. Server pulls the current `refreshToken` and physically invalidates the session footprint in the persistence layer.
3. Server explicitly uses `res.clearCookie()` wiping both `jwt` and `refreshToken` from the browser context globally.

---

## ⚙️ 2FA Management (Requires Active Session)
- **Generate:** `POST /auth/2fa/generate` creates the private secret and returns a scannable QR Code image URL for Google Authenticator.
- **Enable:** `POST /auth/2fa/enable` requires the user to input the generated code to confirm setup completion.
- **Disable:** `POST /auth/2fa/disable` requires an active code verification step before turning the security layer off.

---

## 🔒 Password Recovery Layer
- **Forgot Password:** `POST /auth/forgot-password` generates a temporary, randomized token emailed to the core address.
- **Reset Password:** `POST /auth/reset-password` consumes the specific token. Crucially, resetting the password **immediately triggers a global session wipe (Cookie clearing)** preventing legacy endpoints from behaving irregularly. 

---

_Audit Note:_ All activities inside the Authentication Flow (`LOGIN`, `OAUTH_LOGIN`, `LOGIN_2FA`, `REGISTER`, `LOGOUT`, `RESET_PASSWORD`) fire strict, permanent logs via `AuditService` to trace state transitions per user explicitly.
