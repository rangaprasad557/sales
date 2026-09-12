---
trigger: always_on
description: Mandatory Quality Gate enforcing Solution Design, Staged Small PRs, Every-Scenario Testing, and Iterative Multi-Agent Review.
---

# Agentic Quality Gate & Review Rules

Every modification in this repository must undergo:
1. **Solution Design & Staged PR Plan**: Formal solution design producing a phased delivery plan broken down into small, self-contained PRs covering the modular monolith (NestJS / TypeScript, PostgreSQL 16 + pgvector, Drizzle ORM, Next.js App Router, shadcn/ui, TanStack Query, Zustand, Mobbin-grade UI/UX, Gmail SSO, configurable masters: Customer, Supplier, Category, Catalogue).
2. **Plan Approval**: The delivery plan must be reviewed and explicitly approved before code changes commence.
3. **Staged Delivery & PR Documentation**: For every small PR, document code changes, architecture, test scenarios, and review verdicts in `docs/prs/PR-XXX.md`.
4. **Automated Test Execution & Mandatory Visual Testing**: 100% test pass rate across all unit, integration, edge cases, negative tests, and accessibility tests. In addition, **ALL UI/UX changes MUST pass visual testing** (layout integrity across desktop/mobile viewports, WCAG 2.1 AA/AAA contrast ratios, color-blind simulations, drawer/modal rendering, and focus-visible rings) with zero visual regressions.
5. **Iterative Multi-Agent Review**: `functional_reviewer`, `e2e_reviewer`, and `critic_agent` inspect the changes, including verification of visual testing evidence for UI/UX. If any **MAJOR** or **BLOCKER** issue (functional, test, or visual regression) is identified, the agent must fix and trigger re-review iteratively until **APPROVED**.
6. **Audit Documentation**: Record review notes and test outputs in `AGENT_LOG.md`.


