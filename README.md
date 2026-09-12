# Apex Inventory & Sales System (React UI)

> **Multi-Batch Costing, Lowest-Cost-First Billing, Manual Lot Override & Granular Profit Analytics (Day to Year)**

A modern web application built with **React 18**, **Tailwind CSS**, and a self-contained Python backend. Designed for merchants and sales teams who procure products at fluctuating prices across multiple channels (*Wholesale, Quick Commerce, E-Commerce*) and need exact profit margins, automated lowest-cost lot allocation, and granular analytics.

---

## ⚡ Quick Start (Ready in 10 Seconds)

**Zero external dependencies required** (runs on standard Python 3.7+ without any pip packages or npm install needed).

### Windows
Double-click `start.bat` or run in PowerShell/CMD:
```powershell
python server.py
```

### Linux / macOS
```bash
python3 server.py
```

Open your browser at: **[http://localhost:8000](http://localhost:8000)**

---

## 🌟 Core Features

### 1. Product Catalogue Management
- **Master Catalogue View**: Dedicated tab to explore, register, search, and manage all your product SKUs, units of measure, categories, and minimum stock alert thresholds.
- **Instant "+ Add to Catalogue" Button**: Accessible at any time from the top header bar and from the catalogue dashboard.
- **Quick Actions**: Quickly trigger "Procure Stock" or "Sell Item" directly from any product card in the catalogue.

### 2. Multi-Batch Inventory & Procurement (Stock In)
- **Fluctuating Procurement Prices**: Products procured at different times and costs create discrete inventory lots.
- **Source Tracking**: Records procurement source (*Wholesale Shop, Quick Commerce, E-Commerce, Other*), invoice reference, and date.
- **Batch Visibility**: Track remaining quantity, initial quantity, unit cost, and total value per lot.

### 3. Lowest-Cost-First Automated Billing (Default)
- **Maximizes Profit Margins**: When a salesperson enters a sale, the system automatically bills from the lowest-cost available batch first ("Cheapest-First").
- **Automatic Batch Splitting**: If the requested quantity exceeds the cheapest batch, the system automatically draws the remainder from the next cheapest batch.
- **Exact COGS Tracking**: Cost of Goods Sold is calculated to the cent based on exact allocated lot costs.

### 4. Manual Batch Selection Override
- **Salesperson Choice**: Have an item procured at Price 1 and Price 2? You can open the **Batch Selector** to manually choose which lot(s) to bill from instead of the lowest cost.
- **Full Transparency**: Real-time margin and profit calculation updates instantly based on selected lots.

### 5. Granular Profit & Sales Analytics (Day to Year)
- **Timeframe Aggregations**: Switch instantly between:
  - **Day**: Daily breakdown of sales and margins.
  - **Week**: Weekly revenue, COGS, and profit trends.
  - **Month**: Monthly financial summaries.
  - **Year**: Year-over-year performance.
  - **Custom Date Range**: Specific start and end dates.
- **Per-Item Profitability Table**: Units sold, revenue, COGS, net profit, margin %, and average selling price vs average procurement cost.
- **Audit Trail**: Click any product to inspect all procurement batches and sales history.

### 6. Sales POS & Receipts
- **Customer Selection & Quick-Add**: Retail walk-ins or recurring corporate clients.
- **Printable Invoices**: Professional customer receipt with customer details, item quantities, prices, and total bill.

### 7. Accessible Light Blue & Color-Blind Friendly Architecture
- **Soft Ambient Light Blue**: Ambient azure canvas (`#f8fbff`) with sky tokens (`brand-50` to `brand-950`) eliminating optical fatigue.
- **Zero Color-Only Reliance (WCAG 2.1 AA/AAA)**: Every indicator pairs unique vector icons, textual signs, and numbers (`✓ In Stock`, `⚠ Low Stock`, `✕ Out of Stock`, `↑ +$X`, `↓ -$X`).
- **Interactive Accessibility & Legend Guide**: Direct access via `? Accessibility & Legend` in the navigation header.

---

## 🏗️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend UI** | **React 18** + **ReactDOM** | Modular component architecture (`useState`, `useEffect`, `useMemo`) |
| **Styling** | **Tailwind CSS** (CDN) | Accessible light-blue sky palette, ambient azure background, high-contrast scrollbars |
| **Visualizations**| **Chart.js** | Interactive time-series charts for revenue, cost & profit (color-blind safe 3-color palette) |
| **Icons** | **Lucide Icons** | Crisp modern SVG vector icons for shapes, symbols, and directions |
| **Backend** | **Python Standard Library** | Zero-dependency HTTP REST API (`http.server` + `sqlite3` + `json`) |
| **Database** | **SQLite 3** (`inventory_sales.db`) | ACID transactional multi-lot schema with foreign keys and indexes |

---

## 📂 Project Structure

```
├── db.py                 # SQLite database schema, indices, and realistic seed data
├── server.py             # REST API server, lot allocation engine & static file router
├── test_suite.py         # Automated unit, integration, and allocation test suite
├── index.html            # SPA HTML entry point
├── static/
│   └── app.jsx           # React 18 application with all POS, Inventory, and Analytics views
├── start.bat             # One-click Windows startup script
├── start.sh              # One-click Linux/macOS startup script
├── README.md             # This overview file
├── ARCHITECTURE.md       # Technical architecture & algorithm documentation
├── DEVELOPER_GUIDE.md    # Step-by-step developer onboarding guide (zero prior knowledge)
└── AGENT_LOG.md          # Agentic engineering log & subagent review reports
```

---

## 🧪 Running Automated Tests & Quality Gates

Run the comprehensive 23-test suite verifying Lowest-Cost-First allocation, split-batch handling, manual overrides, granular analytics, and live HTTP REST endpoints:

```bash
python test_suite.py
```
Expected output:
```
Ran 23 tests in 1.270s

OK (100% pass rate)
```

---

## 🛡️ Repository Quality Gate

Every modification in this repository is strictly governed by rules defined in `GEMINI.md`, `AGENTS.md`, and `.agents/rules/agentic_quality_gate.md`:
1. **Functional Review**: Verifies multi-batch costing, Lowest-Cost-First allocation, manual override, Day-to-Year analytics, and catalogue management.
2. **Automated E2E Tests**: 100% test pass rate across all 23 tests in `test_suite.py`.
3. **Critic Agent Review**: Adversarial scrutiny by the `critic_agent` before completion.
4. **Audit Logging**: Full traceability preserved in `AGENT_LOG.md`.

