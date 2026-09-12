# PR-002: Google SSO Authentication & User Management (JWT + Passport)

## PR Title & Metadata
- **PR**: PR-002
- **Branch**: `feature/pr-002-google-sso-auth`
- **Target Branch**: `master`
- **Author**: Antigravity Agent
- **Stage**: 2 of 10
- **Status**: IN PROGRESS / READY FOR REVIEW

---

## 1. Objective & Scope
The objective of PR-002 is to establish secure authentication and role-based user management for the modular monolith API:
1. **Google OAuth 2.0 / OpenID Connect Token Verification**:
   - Verify Google ID tokens via `google-auth-library` (`OAuth2Client`).
   - Extract user identity: email, full name, avatar picture URL, and Google Subject ID.
2. **User Synchronization & Role Management**:
   - Upsert user in PostgreSQL `users` table via Drizzle ORM.
   - Assign roles: `salesperson` (default), `admin`, `auditor`.
3. **Stateless JWT Sessions & Passport Strategy**:
   - Issue signed JWT session tokens containing user identity and role claims.
   - Implement `JwtStrategy` and `JwtAuthGuard` protecting API routes.
   - Implement `RolesGuard` and `@Roles(...)` decorator for role-based authorization.
4. **API Endpoints**:
   - `POST /api/auth/google`: Exchange Google ID token for JWT session token and user profile.
   - `POST /api/auth/dev-login`: Secure development / test token issuer for automated suites.
   - `GET /api/auth/me`: Return authenticated profile and permissions.
   - `POST /api/auth/logout`: Clear session.
   - `GET /api/users`: List users (Admin/Auditor).
   - `PATCH /api/users/:id/role`: Update user role (Admin only).
5. **Decoupled API Contract**:
   - Pure JSON REST responses compatible with Web (Next.js), Mobile apps, and LLM read-only agents.

---

## 2. Architectural & Code Modifications

### File Structure:
```
backend/
├── src/
│   ├── app.module.ts              # Root NestJS application module
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts     # Auth module registration
│   │   │   ├── auth.service.ts    # Google verification & JWT generation
│   │   │   ├── auth.controller.ts # /api/auth endpoints
│   │   │   ├── jwt.strategy.ts    # Passport JWT verification strategy
│   │   │   ├── jwt-auth.guard.ts  # Route authentication guard
│   │   │   ├── roles.guard.ts     # Role-based authorization guard
│   │   │   └── roles.decorator.ts # @Roles() metadata decorator
│   │   └── users/
│   │       ├── users.module.ts    # Users module registration
│   │       ├── users.service.ts   # User queries & role modifications
│   │       └── users.controller.ts# /api/users endpoints
│   └── main.ts                    # Bootstrap with global validation & CORS
└── tests/
    └── auth.test.ts               # Unit & integration auth tests
```

---

## 3. Test Scenarios Covered & Execution Results
1. **Google Token Verification & User Upsert**:
   - Valid token extracts profile and persists user to database.
   - Repeated logins update existing user records without duplicating primary keys (`UsersService.upsertGoogleUser` idempotency verified).
2. **JWT Token Signing & Authentication Guard**:
   - Valid Bearer token allows access to protected `/api/auth/me`.
   - Missing, expired, or tampered token returns `401 Unauthorized`.
   - JWT structure contains `sub`, `email`, and `role`.
3. **Role-Based Authorization**:
   - Accessing admin-protected routes with `salesperson` role returns `403 Forbidden`.
   - Accessing admin-protected routes with `admin` role succeeds.
   - Missing role or unauthenticated requests rejected with `ForbiddenException`.
4. **Execution Results**:
   - **Jest Auth & Schema Suites (`tests/*.test.ts`)**: 28/28 tests PASS (100%).
   - **Python Regression Suite (`test_suite.py`)**: 26/26 tests PASS (100%).
   - **Total Tests**: 54 automated tests across stacks, 0 failures.

---

## 4. Multi-Agent Review Verdicts
- **Functional Reviewer**: Pending review
- **E2E Reviewer**: Pending review
- **Critic Agent**: Pending review