# Repository Rules & Quality Gate

> **CRITICAL RULE**: Every change in this repository MUST follow the mandatory Solution Design & Staged PR workflow, satisfy all automated tests covering every scenario, and undergo iterative adversarial review by specialized agents (Functional Reviewer, E2E Reviewer, Critic Agent) with zero unresolved Major or Blocker issues before completion.

---

## 1. Mandatory End-to-End Workflow & Delivery Plan

Whenever you make changes to this codebase, you MUST follow these non-negotiable phases:

### Phase 1: Solution Design & Staged Delivery Planning
- Prior to making any source code change, create a comprehensive **Solution Design**.
- Derive an actionable, staged **Application Delivery Plan** broken down into **Small, Self-Contained Pull Requests (PRs)**.
- Every planned increment must detail:
  - Architecture, domain modules, database schema migrations (Drizzle ORM).
  - API endpoint contracts and consumer compatibility (Web, Mobile, LLM read-only).
  - Component breakdown and state segregation (TanStack Query vs Zustand).
  - Configurable master entities (Customer, Supplier, Category, Catalogue/Product, Units, Sources).
  - Gmail / Google SSO authentication integration.
  - Comprehensive test scenario matrix.

### Phase 2: Plan Review & Explicit User Approval
- The derived delivery plan MUST be submitted for review and receive explicit approval before application modifications commence.
- Do NOT modify or create application source files until the plan is approved.

### Phase 3: Staged Execution via Small PRs
- Implement changes in small, bite-sized PRs according to the approved delivery plan.
- For EVERY PR:
  - Create a dedicated branch or staged changeset.
  - Generate a formal **PR Document** (`docs/prs/PR-XXX.md`) detailing:
    * PR Title, scope, and objective.
    * Architectural and code modifications.
    * Generated test cases and scenarios covered.
    * Verification output and reviewer verdicts.
- **Architectural Standards**:
  - **Architecture**: Modular Monolith.
  - **Backend**: NestJS / TypeScript, PostgreSQL 16 + pgvector, Drizzle ORM (solo migrator owner).
  - **API**: Decoupled, API-driven design serving Web, Mobile, and LLM read-only consumers.
  - **Auth**: Gmail / Google SSO (OAuth 2.0 / OpenID Connect + JWT sessions).
  - **Frontend**: Next.js (App Router) + React, shadcn/ui over Tailwind CSS v4, TanStack Query (server state), Zustand (client/UI-only state).
  - **UI/UX & Accessibility**: Mobbin-grade world-class UI/UX, WCAG 2.1 AA/AAA compliance with zero reliance on color alone, keyboard navigation (`Cmd+K` command palette, accessible focus rings, drawers, and tactile feedback).
  - **Version Control**: Git / GitHub repository name: `sales`.

### Phase 4: Automated Testing, Every-Scenario Coverage & Mandatory Visual Testing
- Generate and run tests for **every scenario**:
  - Happy path workflows (catalogue browsing, procurement intake, Lowest-Cost-First billing, manual override).
  - Edge cases (depletion to 0, over-allocation prevention, partial batch splits, decimal rounding accuracy).
  - Negative tests (invalid inputs, unauthorized access, cross-product lot leakage).
  - Concurrency tests (atomic locking on batch depletion).
- **Mandatory Visual Testing for all UI/UX Changes**:
  - **ALL UI/UX changes MUST pass visual testing** prior to review approval.
  - Visual testing includes: visual layout integrity across desktop and mobile viewports, component rendering, WCAG 2.1 AA/AAA contrast ratios, color-blind safety simulations (Protanopia, Deuteranopia, Tritanopia), zero reliance on color alone, modal/drawer rendering without clipping or overlap, and focus-visible keyboard ring indicators.
  - Review agents (`functional_reviewer`, `e2e_reviewer`, `critic_agent`) must evaluate and verify visual testing evidence before issuing an APPROVED verdict.
- **Constraint**: **100% of automated and visual tests must pass**. Zero failures permitted.

### Phase 5: Iterative Multi-Agent Review
- Invoke review agents: `functional_reviewer`, `e2e_reviewer`, and `critic_agent`.
- **Iterative Review Rule**: If ANY agent identifies a **MAJOR** or **BLOCKER** issue:
  1. Halt progression.
  2. Implement necessary fixes.
  3. Re-execute automated test suite.
  4. Re-deploy the review agents to re-evaluate the fixes.
  5. Repeat until an unambiguous **APPROVED** verdict is secured.

### Phase 6: Documentation & Audit Trail
- Maintain `docs/prs/PR-XXX.md` for each delivered stage.
- Update `README.md` with system architecture, setup commands, and API specs.
- Update `AGENT_LOG.md` with change logs, test execution logs, and Critic Agent verdicts.
- Preserve zero-prior-knowledge developer onboarding standards.

---

## 2. Core Business Logic & Entity Invariants

All implementations across all stacks must strictly maintain:
1. **Configurable Master Entities**:
   - **Customers**: Full CRUD, contact info, billing addresses, credit limits.
   - **Suppliers / Vendors**: Full CRUD, procurement sources, contact info, payment terms.
   - **Categories**: Full CRUD, hierarchical parent/child categories, icons.
   - **Product Catalogue**: Full CRUD, SKUs, units of measure, barcode, min/max stock thresholds, pgvector embeddings for semantic discovery.
   - **Units of Measure & Sources**: Configurable units (`pcs`, `kg`, `box`, etc.) and procurement channels (*Wholesale Shop, Quick Commerce, E-Commerce, Other*).
2. **Multi-Batch Costing**: Inventory lots with fluctuating procurement prices, dates, and suppliers.
3. **Lowest-Cost-First (Cheapest-First) Allocation**: Automated default allocation must bill the lowest-cost available batch first and split cleanly across lots when quantity spans batches.
4. **Manual Batch Selection Override**: Salesperson can override auto-allocation and bill specific lots. The system must prevent cross-product lot leakage.
5. **Granular Analytics (Day to Year)**: Summaries and timeline charts must compute exact Revenue, COGS, Net Profit, and margin % without row multiplication.
6. **Accessible & Mobbin-Grade UI/UX & Visual Testing Gate**: WCAG 2.1 AA/AAA compliance with zero reliance on color alone, responsive layouts for desktop and mobile, command palette, drawers, and micro-interactions. Every UI/UX change must undergo and pass visual testing across viewports and color-blind modes before approval.

