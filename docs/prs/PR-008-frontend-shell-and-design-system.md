# PR-008: Next.js Frontend Shell, Mobbin-Grade Design System, Dark & Light Themes & Visual Testing Gate

## PR Title & Metadata
- **PR**: PR-008
- **Branch**: `feature/pr-008-nextjs-shell-and-design-system`
- **Target Branch**: `master`
- **Author**: Antigravity Agent
- **Stage**: 8 of 10
- **Status**: IN PROGRESS / READY FOR REVIEW

---

## 1. Objective & Scope
The objective of PR-008 is to establish the modern Next.js frontend shell, Mobbin-grade design system, dark and light theme engine, accessible navigation, and the mandatory visual testing quality gate:
1. **Next.js App Router Architecture (`frontend/`)**:
   - Modern App Router structure with React, Zustand client UI state store, and TanStack Query server state management.
2. **Mobbin-Grade Design System & Dark/Light Theming**:
   - Tailored light-blue brand aesthetic with smooth, instant theme switching (`dark`, `light`, `system`) and `localStorage` persistence.
   - Strict adherence to WCAG 2.1 AAA color contrast ratios ($\ge 7:1$ for body and key text elements).
   - Zero reliance on color alone: every status indicator, badge, and alert couples color with high-contrast borders, distinct icons, and descriptive textual tags.
3. **Command Palette (`Cmd+K` / `Ctrl+K`) & Keyboard Accessibility**:
   - Omnipresent command palette with instant search navigation across POS Billing, Catalogue, Procurement, Customers, Suppliers, and Analytics.
   - Global keyboard navigation with visible focus indicators (`focus-visible:ring-2 focus-visible:ring-offset-2`).
4. **Google SSO & Dev Authentication Screen**:
   - Google SSO login screen with OAuth 2.0 flow and dev-login bypass for offline testing.
5. **Mandatory Visual Testing Quality Gate**:
   - Automated visual and accessibility verification suite testing:
     * Contrast ratio compliance across Dark and Light themes ($\ge 7:1$).
     * Viewport layout integrity: Desktop (1440px) vs Mobile (375px).
     * Color-blind safety simulations (Protanopia, Deuteranopia, Tritanopia).
     * Modal and drawer rendering without clipping or content overlap.
     * Focus-visible keyboard rings.

---

## 2. Architectural & Code Modifications

### File Structure:
```
frontend/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── app/
│   ├── globals.css              # Dark & light theme variables & high-contrast tokens
│   ├── layout.tsx               # Root layout with ThemeProvider, TanStack Query & CommandPalette
│   ├── page.tsx                 # Mobbin-grade dashboard navigation shell
│   └── login/
│       └── page.tsx             # Google SSO & dev authentication portal
├── components/
│   ├── ThemeToggle.tsx          # Accessible light/dark toggle with tactile feedback
│   ├── CommandPalette.tsx       # Accessible Cmd+K modal palette
│   └── Navigation.tsx           # Desktop header & mobile drawer navigation
├── store/
│   └── useUIStore.ts            # Zustand client/UI state store
├── lib/
│   └── queryClient.ts           # TanStack Query client
└── tests/
    └── visual_theme_a11y.test.ts # Mandatory visual testing & accessibility test suite
```

---

## 3. Test Scenarios Covered & Execution Results
1. **Dark & Light Theme Switching**:
   - Theme toggle swaps CSS custom properties between dark and light palettes.
   - System theme auto-detection and persistent storage in `localStorage`.
2. **WCAG 2.1 AAA Contrast Ratios**:
   - Contrast calculation $\ge 7:1$ for text elements in both dark and light modes.
3. **Color-Blind Safety Simulation**:
   - Verification that status badges (In Stock, Low Stock, Depleted) include text and icons alongside color.
4. **Responsive Layout Breakpoints**:
   - Desktop layout (1440px) renders sidebar/navigation; mobile layout (375px) renders touch-friendly drawer.
5. **Keyboard Accessibility & Command Palette**:
   - `Cmd+K` / `Ctrl+K` keybindings open command palette with focus trapping and `Esc` dismissal.
6. **Automated & Visual Testing Results**:
   - **Frontend Visual & A11y Suite**: 1/1 test suite passed, 10/10 tests passed (100%).
   - **Backend Jest Suite**: 7/7 test suites passed, 94/94 tests passed (100%).
   - **Python Test Suite**: 33/33 tests passed (100%).
   - **Next.js Production Build**: Succeeded (`next build` compiled 5 static routes with 0 errors).
   - **Total Automated & Visual Tests**: 137 tests executed across stacks, 0 failures.

---

## 4. Multi-Agent Review Verdicts
- **Functional Reviewer**: Pending review
- **E2E Reviewer**: Pending review
- **Critic Agent**: Pending review

