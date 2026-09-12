const { useState, useEffect, useMemo, useRef } = React;

// ==============================================================================
// SVG Icon Components (Lucide styled)
// ==============================================================================
const Icon = ({ name, className = "w-5 h-5", ...props }) => {
  const icons = {
    trending: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    pos: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    procure: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    inventory: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    invoice: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    plus: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    trash: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
    search: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    printer: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    x: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    chevronDown: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    chevronUp: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    ),
    sliders: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    info: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    catalogue: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    star: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24" {...props}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    tag: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <circle cx="7" cy="7" r="1.5" />
      </svg>
    ),
    alert: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    checkCircle: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    xCircle: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    trendingUp: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    trendingDown: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    ),
    zap: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    globe: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    store: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
      </svg>
    ),
    package: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    sun: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
    moon: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    )
  };
  return icons[name] || null;
};

// ==============================================================================
// Accessible Source Badge Component (Icon + Label for Color-Blind Clarity)
// ==============================================================================
const SourceBadge = ({ source }) => {
  const config = {
    "Wholesale Shop": {
      icon: "store",
      classes: "bg-sky-50 text-sky-900 border-sky-300 font-semibold"
    },
    "Quick Commerce": {
      icon: "zap",
      classes: "bg-amber-50 text-amber-950 border-amber-300 font-semibold"
    },
    "E-Commerce": {
      icon: "globe",
      classes: "bg-indigo-50 text-indigo-950 border-indigo-300 font-semibold"
    },
    "Other": {
      icon: "package",
      classes: "bg-slate-100 text-slate-900 border-slate-300 font-semibold"
    }
  };
  const c = config[source] || config["Other"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs border shadow-xs ${c.classes}`} title={`Procured from: ${source}`}>
      <Icon name={c.icon} className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{source}</span>
    </span>
  );
};

// ==============================================================================
// Accessible Stock Status Badge (Zero Color-Only Reliance)
// ==============================================================================
const StockBadge = ({ totalUnits, reorderLevel = 10, unit = "units" }) => {
  if (totalUnits <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-900 border border-rose-300 shadow-xs" title="Out of stock - 0 units available">
        <Icon name="xCircle" className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
        <span>✕ Out of Stock (0 {unit})</span>
      </span>
    );
  }
  if (totalUnits <= reorderLevel) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-950 border border-amber-300 shadow-xs" title="Low stock threshold reached - reorder advised">
        <Icon name="alert" className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>⚠ Low Stock ({totalUnits} {unit})</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-900 border border-teal-300 shadow-xs" title="Stock available for billing">
      <Icon name="checkCircle" className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
      <span>✓ In Stock ({totalUnits} {unit})</span>
    </span>
  );
};

// ==============================================================================
// Accessible Profit & Margin Badge (Icon + Text Symbol for Color-Blind Clarity)
// ==============================================================================
const ProfitBadge = ({ profit, margin = null }) => {
  const isPositive = profit > 0;
  const isZero = Math.abs(profit) < 0.001;
  if (isZero) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
        <span>= {fmt(profit)} (Breakeven)</span>
      </span>
    );
  }
  if (isPositive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-teal-900 border border-teal-300">
        <Icon name="trendingUp" className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
        <span>+{fmt(profit)} {margin !== null ? `(+${margin}%)` : ""}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-900 border border-rose-300">
      <Icon name="trendingDown" className="w-3.5 h-3.5 text-rose-700 flex-shrink-0" />
      <span>-{fmt(Math.abs(profit))} {margin !== null ? `(${margin}%)` : ""}</span>
    </span>
  );
};

// ==============================================================================
// Currency Formatter
// ==============================================================================
const fmt = (num) => {
  const val = Number(num) || 0;
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ==============================================================================
// Main React Application
// ==============================================================================
function App() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("apex_theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("apex_theme", theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'product', 'customer', 'lotSelect', 'invoice', 'drilldown'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [drilldownProduct, setDrilldownProduct] = useState(null);
  const [lotSelectContext, setLotSelectContext] = useState(null); // for manual lot selection in sales POS

  // Show Toast notification
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetching
  const refreshAllData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes, invRes, salesRes, procRes] = await Promise.all([
        fetch("/api/products").then(r => r.json()),
        fetch("/api/customers").then(r => r.json()),
        fetch("/api/inventory").then(r => r.json()),
        fetch("/api/sales").then(r => r.json()),
        fetch("/api/procurements").then(r => r.json())
      ]);

      if (prodRes.success) setProducts(prodRes.products);
      if (custRes.success) setCustomers(custRes.customers);
      if (invRes.success) {
        setInventorySummary(invRes.summary);
        setInventoryList(invRes.inventory);
      }
      if (salesRes.success) setSalesHistory(salesRes.sales);
      if (procRes.success) setProcurements(procRes.procurements);
    } catch (err) {
      console.error("Failed to load initial data:", err);
      showToast("Error connecting to server. Please ensure server is running.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fbff] text-slate-800">
      {/* Toast Alert with High-Contrast Accessible Card */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold border-2 transition-all duration-300 ${
          toast.type === "error"
            ? "bg-white text-rose-950 border-rose-500 shadow-rose-900/10"
            : "bg-white text-sky-950 border-sky-500 shadow-sky-900/10"
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
            toast.type === "error" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
          }`}>
            <Icon name={toast.type === "error" ? "xCircle" : "checkCircle"} className="w-5 h-5" />
          </div>
          <span className="pr-2">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar in Accessible Light Blue Aesthetic */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-30 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
                <Icon name="inventory" className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-sky-950">Apex<span className="text-sky-600">Inventory</span></span>
                <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-50 text-sky-800 border border-sky-300">
                  <Icon name="star" className="w-3 h-3 text-sky-600" />
                  Lowest-Cost Billing
                </span>
              </div>
            </div>

            {/* Live Store Stock & Valuation Badge */}
            {inventorySummary && (
              <div className="hidden md:flex items-center gap-4 bg-sky-50/70 px-3.5 py-1.5 rounded-lg border border-sky-200 text-xs">
                <div>
                  <span className="text-slate-600">Store Valuation:</span>{" "}
                  <span className="font-bold text-sky-950">{fmt(inventorySummary.total_valuation)}</span>
                </div>
                <div className="w-px h-4 bg-sky-300" />
                <div>
                  <span className="text-slate-600">Total Stock:</span>{" "}
                  <span className="font-bold text-sky-950">{inventorySummary.total_units} units</span>
                </div>
                {inventorySummary.low_stock_count > 0 && (
                  <>
                    <div className="w-px h-4 bg-sky-300" />
                    <div className="text-amber-900 font-bold flex items-center gap-1">
                      <Icon name="alert" className="w-3.5 h-3.5 text-amber-600" />
                      {inventorySummary.low_stock_count} low stock
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Action Buttons & Accessibility Guide */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-sky-100 dark:bg-slate-800 hover:bg-sky-200 dark:hover:bg-slate-700 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer"
                title={`Current theme: ${theme}. Click to toggle.`}
                aria-label="Toggle dark/light theme"
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} className="w-3.5 h-3.5" />
                <span className="hidden sm:inline capitalize">{theme}</span>
              </button>
              <button
                onClick={() => setActiveModal("accessibility")}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 font-bold text-xs shadow-xs transition-all"
                title="Color-blind safe guide & symbol explanations"
              >
                <Icon name="info" className="w-3.5 h-3.5 text-sky-700" />
                <span className="hidden sm:inline">Accessibility & Legend</span>
              </button>
              <button
                onClick={() => setActiveModal("product")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition-all"
                title="Add product to catalogue"
              >
                <Icon name="plus" className="w-4 h-4" />
                <span className="hidden sm:inline">+ Add to Catalogue</span>
              </button>
              <button
                onClick={() => setActiveTab("sales")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all"
              >
                <Icon name="pos" className="w-4 h-4" />
                <span className="hidden sm:inline">New Sale</span>
              </button>
              <button
                onClick={() => setActiveTab("procurement")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-xs transition-all"
              >
                <Icon name="plus" className="w-4 h-4" />
                <span className="hidden sm:inline">Procure Stock</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-3 border-t border-sky-100 overflow-x-auto py-2">
            {[
              { id: "analytics", label: "Dashboard & Analytics", icon: "trending" },
              { id: "catalogue", label: "Product Catalogue", icon: "catalogue" },
              { id: "sales", label: "Sales & POS Billing", icon: "pos" },
              { id: "procurement", label: "Procurement (Stock In)", icon: "procure" },
              { id: "inventory", label: "Store Stock & Lots", icon: "inventory" },
              { id: "invoices", label: "Sales History", icon: "invoice" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-sky-100 text-sky-900 font-bold border-b-2 border-sky-600 shadow-2xs"
                    : "text-slate-600 hover:text-sky-900 hover:bg-sky-50/70"
                }`}
              >
                <Icon name={tab.icon} className={`w-4 h-4 ${activeTab === tab.id ? "text-sky-700" : "text-slate-400"}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "catalogue" && (
          <CatalogueView
            products={products}
            inventoryList={inventoryList}
            onOpenProductModal={() => setActiveModal("product")}
            onProcureProduct={(prod) => {
              setActiveTab("procurement");
            }}
            onSellProduct={(prod) => {
              setActiveTab("sales");
            }}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsView
            onDrillDown={(product) => {
              setDrilldownProduct(product);
              setActiveModal("drilldown");
            }}
          />
        )}

        {activeTab === "sales" && (
          <SalesView
            products={products}
            customers={customers}
            inventoryList={inventoryList}
            onSaleCompleted={(invoice) => {
              setSelectedInvoice(invoice);
              setActiveModal("invoice");
              refreshAllData();
            }}
            onOpenCustomerModal={() => setActiveModal("customer")}
            onOpenLotSelector={(context) => {
              setLotSelectContext(context);
              setActiveModal("lotSelect");
            }}
            showToast={showToast}
          />
        )}

        {activeTab === "procurement" && (
          <ProcurementView
            products={products}
            onProcurementCreated={() => {
              refreshAllData();
              showToast("Procurement recorded! Batches added to inventory.");
            }}
            onOpenProductModal={() => setActiveModal("product")}
            showToast={showToast}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryView
            inventoryList={inventoryList}
            summary={inventorySummary}
            onProcureProduct={(prod) => {
              setActiveTab("procurement");
            }}
            onSellProduct={(prod) => {
              setActiveTab("sales");
            }}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === "invoices" && (
          <InvoicesHistoryView
            salesHistory={salesHistory}
            onViewInvoice={async (saleId) => {
              try {
                const res = await fetch(`/api/sales/${saleId}`).then(r => r.json());
                if (res.success) {
                  setSelectedInvoice(res.sale);
                  setActiveModal("invoice");
                }
              } catch (e) {
                showToast("Failed to load invoice details", "error");
              }
            }}
          />
        )}
      </main>

      {/* Modals */}
      {activeModal === "invoice" && selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setActiveModal(null);
            setSelectedInvoice(null);
          }}
        />
      )}

      {activeModal === "product" && (
        <ProductModal
          onClose={() => setActiveModal(null)}
          onCreated={(newProd) => {
            setActiveModal(null);
            refreshAllData();
            showToast(`Product "${newProd.name}" created!`);
          }}
          showToast={showToast}
        />
      )}

      {activeModal === "customer" && (
        <CustomerModal
          onClose={() => setActiveModal(null)}
          onCreated={(newCust) => {
            setActiveModal(null);
            refreshAllData();
            showToast(`Customer "${newCust.name}" added!`);
          }}
          showToast={showToast}
        />
      )}

      {activeModal === "lotSelect" && lotSelectContext && (
        <LotSelectorModal
          context={lotSelectContext}
          onClose={() => {
            setActiveModal(null);
            setLotSelectContext(null);
          }}
          onApply={(updatedLine) => {
            lotSelectContext.onApply(updatedLine);
            setActiveModal(null);
            setLotSelectContext(null);
          }}
        />
      )}

      {activeModal === "drilldown" && drilldownProduct && (
        <ItemDetailModal
          product={drilldownProduct}
          onClose={() => {
            setActiveModal(null);
            setDrilldownProduct(null);
          }}
        />
      )}

      {activeModal === "accessibility" && (
        <AccessibilityModal
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

// ==============================================================================
// 0. Product Catalogue Management View
// ==============================================================================
function CatalogueView({ products, inventoryList, onOpenProductModal, onProcureProduct, onSellProduct, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const catalogueItems = useMemo(() => {
    return products.map(p => {
      const inv = inventoryList.find(i => i.id === p.id);
      return {
        ...p,
        total_stock: inv ? inv.total_stock : (p.total_stock || 0),
        avg_cost: inv ? inv.avg_cost : 0,
        lots_count: inv && inv.lots ? inv.lots.length : 0,
        total_valuation: inv ? inv.total_valuation : 0
      };
    });
  }, [products, inventoryList]);

  const filtered = useMemo(() => {
    return catalogueItems.filter(item => {
      const matchCat = selectedCategory === "all" || item.category === selectedCategory;
      const matchSearch = !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogueItems, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">Product Master Catalogue Guide:</p>
          <p className="text-slate-700 leading-relaxed">
            Register and manage your master product items, SKU codes, and minimum stock alerts. Each product holds discrete procurement batches with fluctuating costs. When a sale occurs, the system automatically selects the cheapest available lot first.
          </p>
        </div>
      </div>

      {/* Header with prominent Add to Catalogue Button */}
      <div className="bg-white p-5 rounded-xl border border-sky-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sky-950">Product Catalogue Management</h1>
          <p className="text-sm text-slate-600">Register products, SKUs, units of measure, and set minimum stock alert thresholds.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-300 hover:bg-sky-50 text-sky-900 text-xs font-bold transition-all"
          >
            Refresh
          </button>
          <button
            onClick={onOpenProductModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-all"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>+ Add to Catalogue</span>
          </button>
        </div>
      </div>

      {/* Catalogue Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
          <p className="text-2xl font-black text-sky-950 mt-1">{products.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Registered in catalogue</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</span>
          <p className="text-2xl font-black text-sky-600 mt-1">{Math.max(0, categories.length - 1)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Product departments</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Stock Products</span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            {catalogueItems.filter(i => i.total_stock > 0).length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Ready for billing</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low / Out of Stock</span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {catalogueItems.filter(i => i.total_stock <= i.min_stock).length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Needs procurement</span>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
          <input
            type="text"
            placeholder="Search catalogue by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/30"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all capitalize ${
                selectedCategory === cat
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-xl border border-sky-200 text-slate-500 space-y-3">
            <Icon name="catalogue" className="w-10 h-10 mx-auto text-sky-400" />
            <p className="text-base font-bold text-sky-950">No catalogue products match your search.</p>
            <button
              onClick={onOpenProductModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              + Add Product to Catalogue
            </button>
          </div>
        ) : (
          filtered.map(item => {
            return (
              <div key={item.id} className="bg-white rounded-xl border border-sky-200/80 p-5 shadow-xs hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      {item.category}
                    </span>
                    <StockBadge totalUnits={item.total_stock} reorderLevel={item.min_stock} unit={item.unit} />
                  </div>

                  <div>
                    <h3 className="font-black text-sky-950 text-base">{item.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-sky-50/40 p-2.5 rounded-lg border border-sky-100">
                    <div>
                      <span className="text-slate-600 font-medium">Current Stock:</span>
                      <div className="font-bold text-sky-950 text-sm">{item.total_stock} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">Min Threshold:</span>
                      <div className="font-semibold text-slate-700 text-sm">{item.min_stock} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">Active Batches:</span>
                      <div className="font-semibold text-slate-700">{item.lots_count} lots</div>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">Avg Cost:</span>
                      <div className="font-bold text-sky-950">{fmt(item.avg_cost)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-sky-100">
                  <button
                    onClick={() => onProcureProduct(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    Procure Stock
                  </button>
                  <button
                    onClick={() => onSellProduct(item)}
                    disabled={item.total_stock <= 0}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-800 border border-sky-200 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="pos" className="w-3.5 h-3.5" />
                    Sell Now
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// 1. Analytics & Dashboard View (Granular Day to Year)
// ==============================================================================
function AnalyticsView({ onDrillDown }) {
  const [granularity, setGranularity] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ granularity });
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const res = await fetch(`/api/analytics?${params.toString()}`).then(r => r.json());
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [granularity, fromDate, toDate]);

  // Render Chart.js when data changes
  useEffect(() => {
    if (!data || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.timeline.map(t => t.time_bucket);
    const revenues = data.timeline.map(t => t.revenue);
    const cogs = data.timeline.map(t => t.cogs);
    const profits = data.timeline.map(t => t.profit);

    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["No Sales In Range"],
        datasets: [
          {
            label: "Revenue ($)",
            data: revenues,
            backgroundColor: "rgba(2, 132, 199, 0.85)", // Accessible Azure / Sky Blue
            borderColor: "#0284c7",
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: "COGS / Cost ($)",
            data: cogs,
            backgroundColor: "rgba(99, 102, 241, 0.75)", // Deep Indigo / Slate
            borderColor: "#4f46e5",
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: "Net Realized Profit ($)",
            data: profits,
            backgroundColor: "rgba(13, 148, 136, 0.85)", // Vibrant Teal / Mint
            borderColor: "#0f766e",
            borderWidth: 1.5,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 16,
              usePointStyle: true,
              font: { weight: "bold", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${fmt(context.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => "$" + val }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data || !data.items_breakdown) return [];
    if (!searchTerm) return data.items_breakdown;
    const s = searchTerm.toLowerCase();
    return data.items_breakdown.filter(it =>
      it.product_name.toLowerCase().includes(s) ||
      it.sku.toLowerCase().includes(s) ||
      it.category.toLowerCase().includes(s)
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">Financial & Margin Analytics Guide:</p>
          <p className="text-slate-700 leading-relaxed">
            Switch timeframes between <strong>Day</strong>, <strong>Week</strong>, <strong>Month</strong>, or <strong>Year</strong>. Because stock is billed on a Lowest-Cost-First basis, <strong>COGS (Cost of Goods Sold)</strong> and <strong>Net Profit</strong> reflect the exact procurement lot prices without estimations.
          </p>
        </div>
      </div>

      {/* Header & Granularity Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-sky-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sky-950">Profit & Sales Analytics</h1>
          <p className="text-sm text-slate-600">Track profit margin, COGS, and sales volume per item at any granular level.</p>
        </div>

        {/* Granular Period Selector (Day, Week, Month, Year) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Granularity:</span>
          <div className="inline-flex rounded-lg border border-sky-200 bg-sky-50/70 p-1">
            {[
              { id: "day", label: "Day" },
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
              { id: "year", label: "Year" }
            ].map(g => (
              <button
                key={g.id}
                onClick={() => setGranularity(g.id)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  granularity === g.id
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-sky-900 hover:bg-sky-100"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-sky-200 rounded-md px-2 py-1 text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/30"
              title="From date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-sky-200 rounded-md px-2 py-1 text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/30"
              title="To date"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-1 font-bold"
                title="Clear dates"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {data && data.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <p className="text-2xl font-black text-sky-950 mt-1">{fmt(data.summary.total_revenue)}</p>
            <span className="text-xs text-slate-500 mt-1 block">{data.summary.total_orders} sales orders</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total COGS (Cost)</span>
            <p className="text-2xl font-black text-slate-700 mt-1">{fmt(data.summary.total_cogs)}</p>
            <span className="text-xs text-slate-500 mt-1 block">Low-cost first basis</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs bg-gradient-to-br from-white to-teal-50/40">
            <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">Net Realized Profit</span>
            <p className="text-2xl font-black text-teal-700 mt-1">{fmt(data.summary.total_profit)}</p>
            <span className="text-xs text-teal-800 font-bold mt-1 block">+{data.summary.margin_pct}% net margin</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Units Sold</span>
            <p className="text-2xl font-black text-sky-600 mt-1">{data.summary.total_units_sold}</p>
            <span className="text-xs text-slate-500 mt-1 block">Across all products</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Batches</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-sky-950">
                {data.sources_breakdown ? data.sources_breakdown.length : 0}
              </span>
              <span className="text-xs text-slate-500">Procurement sources</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {data.sources_breakdown && data.sources_breakdown.map(s => (
                <SourceBadge key={s.source} source={s.source} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-xl border border-sky-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-sky-950">
              {granularity.toUpperCase()} Trend: Revenue vs Cost vs Net Profit
            </h2>
            <p className="text-xs text-slate-600">Exact margins generated across the selected timeframe (Color-Blind Safe Palette)</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-sky-100 text-sky-900 border border-sky-300 font-bold rounded-full">
            Granularity: {granularity}
          </span>
        </div>
        <div className="h-72 w-full">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* Granular Item-Level Profitability Table */}
      <div className="bg-white rounded-xl border border-sky-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-sky-950">Granular Item Profitability & Sales Volume</h2>
            <p className="text-xs text-slate-600">Detailed performance per product for the selected period</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Icon name="search" className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/80 text-sky-950 text-xs font-bold uppercase tracking-wider border-b border-sky-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Sold Qty</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">COGS (Cost)</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-right">Avg Price / Cost</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.product_id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-sky-950">{item.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs rounded-md bg-sky-50 text-sky-900 border border-sky-200 font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${item.current_stock > 0 ? "text-sky-950" : "text-rose-700"}`}>
                        {item.current_stock} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-sky-700">
                      {item.units_sold} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {fmt(item.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {fmt(item.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ProfitBadge profit={item.profit} margin={item.margin_pct} />
                    </td>
                    <td className="py-3 px-4 text-right text-xs">
                      <div className="font-bold text-slate-900">Sale: {fmt(item.avg_sale_price)}</div>
                      <div className="text-slate-500">Cost: {fmt(item.avg_cost_price)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDrillDown(item)}
                        className="text-xs font-bold text-sky-800 hover:text-sky-950 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Audit Trail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 2. Sales & POS Billing View (Lowest-Cost-First Default + Manual Override)
// ==============================================================================
function SalesView({ products, customers, inventoryList, onSaleCompleted, onOpenCustomerModal, onOpenLotSelector, showToast }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // New line item inputs
  const [selectedProductId, setSelectedProductId] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [linePrice, setLinePrice] = useState("");

  const currentProduct = useMemo(() => {
    return inventoryList.find(p => p.id === Number(selectedProductId));
  }, [inventoryList, selectedProductId]);

  // Set default sale price when product selected
  useEffect(() => {
    if (currentProduct) {
      // Suggest default price: avg cost + 40% margin
      const defaultPrice = currentProduct.avg_cost > 0 ? (currentProduct.avg_cost * 1.4).toFixed(2) : "20.00";
      setLinePrice(defaultPrice);
      setLineQty(1);
    }
  }, [currentProduct]);

  // Add Item to Cart
  const handleAddToCart = async () => {
    if (!currentProduct) {
      showToast("Please select a product", "error");
      return;
    }
    const qty = Number(lineQty);
    const price = Number(linePrice);

    if (qty <= 0) {
      showToast("Quantity must be greater than 0", "error");
      return;
    }
    if (price < 0) {
      showToast("Price cannot be negative", "error");
      return;
    }
    if (qty > currentProduct.total_stock) {
      showToast(`Only ${currentProduct.total_stock} units available in stock!`, "error");
      return;
    }

    // Call simulation to get lowest-cost-first auto allocation
    try {
      const simRes = await fetch("/api/sales/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            product_id: currentProduct.id,
            qty: qty,
            unit_sale_price: price,
            allocation_mode: "AUTO"
          }]
        })
      }).then(r => r.json());

      if (!simRes.success) {
        showToast(simRes.error || "Allocation error", "error");
        return;
      }

      const itemData = simRes.items[0];
      setCart(prev => [
        ...prev,
        {
          tempId: Date.now() + Math.random(),
          product_id: currentProduct.id,
          product_name: currentProduct.name,
          sku: currentProduct.sku,
          unit: currentProduct.unit,
          qty: qty,
          unit_sale_price: price,
          total_sale_price: itemData.total_sale_price,
          total_cost: itemData.total_cost,
          profit: itemData.profit,
          margin_pct: itemData.margin_pct,
          allocation_mode: "AUTO",
          allocated_lots: itemData.allocated_lots
        }
      ]);

      // Reset form
      setSelectedProductId("");
      setLineQty(1);
      setLinePrice("");
    } catch (e) {
      showToast("Failed to calculate batch allocation", "error");
    }
  };

  const handleRemoveFromCart = (tempId) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Cart totals
  const cartSummary = useMemo(() => {
    const totalSale = cart.reduce((sum, it) => sum + it.total_sale_price, 0);
    const totalCost = cart.reduce((sum, it) => sum + it.total_cost, 0);
    const profit = totalSale - totalCost;
    const margin = totalSale > 0 ? (profit / totalSale * 100).toFixed(1) : "0.0";
    return { totalSale, totalCost, profit, margin };
  }, [cart]);

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        sale_date: saleDate,
        notes: notes,
        items: cart.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          unit_sale_price: item.unit_sale_price,
          allocation_mode: item.allocation_mode,
          manual_lots: item.allocation_mode === "MANUAL"
            ? item.allocated_lots.map(l => ({ lot_id: l.lot_id, qty: l.qty }))
            : []
        }))
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        showToast(`Sale completed! Invoice #${res.invoice_no}`);
        // Fetch full sale for printable receipt
        const fullSale = await fetch(`/api/sales/${res.sale_id}`).then(r => r.json());
        if (fullSale.success) {
          onSaleCompleted(fullSale.sale);
        }
        setCart([]);
        setNotes("");
      } else {
        showToast(res.error || "Failed to complete sale", "error");
      }
    } catch (e) {
      showToast("Error processing sale", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="col-span-full bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">POS Sales Billing Guide:</p>
          <p className="text-slate-700 leading-relaxed">
            <strong>Automated Lowest-Cost Billing</strong>: When you add an item, the system automatically bills the lowest-cost available batch first to maximize your profit margin. If you want to bill from a specific batch instead, click <strong>"Choose Batch / Override"</strong> on any item in your cart.
          </p>
        </div>
      </div>

      {/* Left Column: POS Entry Form */}
      <div className="lg:col-span-7 space-y-6">
        {/* Customer & Date Card */}
        <div className="bg-white p-5 rounded-xl border border-sky-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-sky-950">Sale & Customer Details</h2>
            <button
              onClick={onOpenCustomerModal}
              className="text-xs font-bold text-sky-800 hover:text-sky-950 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md"
            >
              + Add Customer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
            </div>
          </div>
        </div>

        {/* Add Items Card */}
        <div className="bg-white p-5 rounded-xl border border-sky-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-sky-950">Add Items to Bill</h2>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-900 font-bold border border-sky-300">
              <Icon name="star" className="w-3.5 h-3.5 text-sky-600" />
              Lowest-Cost Auto Allocation
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              >
                <option value="">-- Choose Product to Sell --</option>
                {inventoryList.map(p => (
                  <option key={p.id} value={p.id} disabled={p.total_stock <= 0}>
                    {p.name} ({p.sku}) - {p.total_stock} {p.unit} in stock {p.total_stock <= 0 ? "(OUT OF STOCK)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Batches / Lots Preview for Selected Product */}
            {currentProduct && (
              <div className="bg-sky-50/50 p-3 rounded-lg border border-sky-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-sky-950">
                  <span>Available Batches in Inventory:</span>
                  <span className="text-sky-700 font-black">Total: {currentProduct.total_stock} {currentProduct.unit}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentProduct.lots && currentProduct.lots.map(lot => (
                    <div key={lot.id} className="bg-white border border-sky-200 px-2.5 py-1 rounded-md shadow-2xs text-slate-800 flex items-center gap-1.5">
                      <span className="font-bold text-sky-950">{lot.remaining_qty} {currentProduct.unit}</span>
                      <span>@</span>
                      <span className="font-black text-teal-800">{fmt(lot.unit_cost)}</span>
                      <SourceBadge source={lot.source} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={currentProduct?.total_stock || 999}
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sale Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linePrice}
                  onChange={(e) => setLinePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold text-sky-950 bg-sky-50/20"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-end">
                <button
                  onClick={handleAddToCart}
                  disabled={!currentProduct || currentProduct.total_stock <= 0}
                  className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-sm"
                >
                  <Icon name="plus" className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Billing Cart & Lot Allocation Breakdown */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-xl border border-sky-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-sky-50/80 border-b border-sky-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-sky-950">Current Sale Bill</h2>
            <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">{cart.length} item(s)</span>
          </div>

          {/* Cart Items List */}
          <div className="p-4 divide-y divide-sky-50 max-h-[480px] overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Icon name="pos" className="w-8 h-8 mx-auto text-sky-300" />
                <p className="text-sm font-medium text-slate-600">Cart is empty. Select products on the left to bill.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.tempId} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sky-950 text-sm">{item.product_name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.tempId)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove item"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-sky-50/40 p-2.5 rounded-lg border border-sky-100">
                    <div>
                      <span className="font-bold text-slate-800">{item.qty} {item.unit}</span>
                      {" × "}
                      <span className="font-black text-sky-950">{fmt(item.unit_sale_price)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sky-950">{fmt(item.total_sale_price)}</div>
                      <div className="mt-0.5">
                        <ProfitBadge profit={item.profit} margin={item.margin_pct} />
                      </div>
                    </div>
                  </div>

                  {/* Lots Allocation Display & Manual Override Trigger */}
                  <div className="border border-sky-200/70 rounded-lg p-2.5 bg-white space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-950 flex items-center gap-1.5">
                        {item.allocation_mode === "MANUAL" ? (
                          <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                            <Icon name="sliders" className="w-3 h-3 text-amber-700" />
                            Manual Lot Allocation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sky-900 bg-sky-50 border border-sky-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                            <Icon name="star" className="w-3 h-3 text-sky-600" />
                            Auto: Lowest-Cost First
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          onOpenLotSelector({
                            item: item,
                            onApply: (updatedAllocations) => {
                              // Re-simulate with manual lots
                              fetch("/api/sales/simulate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  items: [{
                                    product_id: item.product_id,
                                    qty: item.qty,
                                    unit_sale_price: item.unit_sale_price,
                                    allocation_mode: "MANUAL",
                                    manual_lots: updatedAllocations
                                  }]
                                })
                              })
                              .then(r => r.json())
                              .then(simRes => {
                                if (simRes.success) {
                                  const updated = simRes.items[0];
                                  setCart(prev => prev.map(it => it.tempId === item.tempId ? {
                                    ...it,
                                    allocation_mode: "MANUAL",
                                    total_cost: updated.total_cost,
                                    profit: updated.profit,
                                    margin_pct: updated.margin_pct,
                                    allocated_lots: updated.allocated_lots
                                  } : it));
                                  showToast("Manual lot selection applied!");
                                } else {
                                  showToast(simRes.error, "error");
                                }
                              });
                            }
                          });
                        }}
                        className="text-sky-800 hover:text-sky-950 font-bold flex items-center gap-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded text-[11px]"
                      >
                        <Icon name="sliders" className="w-3 h-3 text-sky-600" />
                        Choose Batch / Override
                      </button>
                    </div>

                    {/* Allocated lots list */}
                    <div className="space-y-1 pt-1">
                      {item.allocated_lots && item.allocated_lots.map((l, lIdx) => (
                        <div key={lIdx} className="flex justify-between items-center text-[11px] text-slate-700 bg-sky-50/50 px-2.5 py-1 rounded border border-sky-100">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sky-950">{l.qty} {item.unit}</span>
                            <span>from</span>
                            <span className="font-mono text-slate-800 font-semibold">{l.batch_code}</span>
                            <SourceBadge source={l.source} />
                          </div>
                          <div className="font-black text-teal-800">
                            Cost: {fmt(l.unit_cost)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer & Checkout */}
          <div className="p-4 bg-sky-50/70 border-t border-sky-200 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Subtotal (Sale Value):</span>
                <span className="font-bold text-sky-950">{fmt(cartSummary.totalSale)}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Total Procurement Cost (COGS):</span>
                <span className="font-bold text-slate-800">{fmt(cartSummary.totalCost)}</span>
              </div>
              <div className="flex justify-between items-center font-bold pt-1.5 border-t border-sky-200">
                <span className="text-sky-950">Total Realized Profit:</span>
                <ProfitBadge profit={cartSummary.profit} margin={cartSummary.margin} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Invoice Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Walk-in customer, discount applied..."
                className="w-full border border-sky-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
              />
            </div>

            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Icon name="check" className="w-5 h-5" />
              {submitting ? "Processing..." : `Complete Sale & Print Bill (${fmt(cartSummary.totalSale)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 3. Procurement (Stock In) View
// ==============================================================================
function ProcurementView({ products, onProcurementCreated, onOpenProductModal, showToast }) {
  const [source, setSource] = useState("Wholesale Shop");
  const [procurementDate, setProcurementDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { product_id: "", qty: 10, unit_cost: 0.00, batch_code: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItemRow = () => {
    setItems(prev => [...prev, { product_id: "", qty: 10, unit_cost: 0.00, batch_code: "" }]);
  };

  const removeItemRow = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const totalProcurementCost = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unit_cost) || 0), 0);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(it => it.product_id && Number(it.qty) > 0 && Number(it.unit_cost) >= 0);
    if (validItems.length === 0) {
      showToast("Please add at least one valid item with quantity and cost", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_no: invoiceNo,
        source: source,
        procurement_date: procurementDate,
        notes: notes,
        items: validItems.map(it => ({
          product_id: Number(it.product_id),
          qty: Number(it.qty),
          unit_cost: Number(it.unit_cost),
          batch_code: it.batch_code
        }))
      };

      const res = await fetch("/api/procurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        onProcurementCreated();
        // Reset form
        setInvoiceNo("");
        setNotes("");
        setItems([{ product_id: "", qty: 10, unit_cost: 0.00, batch_code: "" }]);
      } else {
        showToast(res.error || "Failed to record procurement", "error");
      }
    } catch (err) {
      showToast("Error connecting to server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">Procurement & Batch Intake Guide:</p>
          <p className="text-slate-700 leading-relaxed">
            Whenever you purchase products (from Wholesale, Quick Commerce, or E-Commerce), record them here. Each intake creates a discrete <strong>inventory lot</strong> with its purchase cost and date, enabling automated Cheapest-First billing on sales.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-sky-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-sky-950">Procure Stock (Stock In)</h1>
            <p className="text-sm text-slate-600">Record new stock batches with procurement cost, date, and source.</p>
          </div>
          <button
            type="button"
            onClick={onOpenProductModal}
            className="text-xs font-bold text-sky-800 hover:text-sky-950 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Create New Product
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Procurement Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              >
                <option value="Wholesale Shop">Wholesale Shop</option>
                <option value="Quick Commerce">Quick Commerce (Blinkit, Zepto, etc.)</option>
                <option value="E-Commerce">E-Commerce (Amazon, Flipkart, etc.)</option>
                <option value="Other">Other / Direct Supplier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Procurement Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={procurementDate}
                onChange={(e) => setProcurementDate(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Invoice / PO Reference</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono bg-sky-50/20"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-950">Procured Items & Batch Costs</h3>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-sky-800 hover:text-sky-950 flex items-center gap-1 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                Add Another Product
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((row, idx) => (
                <div key={idx} className="bg-sky-50/30 p-3 rounded-lg border border-sky-200 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Product</label>
                    <select
                      value={row.product_id}
                      onChange={(e) => updateItemRow(idx, "product_id", e.target.value)}
                      className="w-full border border-sky-200 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={row.qty}
                      onChange={(e) => updateItemRow(idx, "qty", e.target.value)}
                      className="w-full border border-sky-200 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none"
                      required
                    >
                    </input>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_cost}
                      onChange={(e) => updateItemRow(idx, "unit_cost", e.target.value)}
                      className="w-full border border-sky-200 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none font-bold text-sky-950"
                      required
                    />
                  </div>

                  <div className="col-span-3 sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">Batch Code (Opt)</label>
                    <input
                      type="text"
                      placeholder="Auto"
                      value={row.batch_code}
                      onChange={(e) => updateItemRow(idx, "batch_code", e.target.value)}
                      className="w-full border border-sky-200 rounded-md px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end items-center pt-4">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove row"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Procurement Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Supplier name, delivery tracking number, quality check notes..."
              className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
            />
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-sky-100">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold">Total Stock In Investment:</span>
              <div className="text-2xl font-black text-sky-950">{fmt(totalProcurementCost)}</div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Icon name="check" className="w-5 h-5" />
              {submitting ? "Saving Batches..." : "Save Procurement & Create Lots"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// 4. Inventory Store View (with Multi-Batch Drawer)
// ==============================================================================
function InventoryView({ inventoryList, summary, onProcureProduct, onSellProduct, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(inventoryList.map(i => i.category));
    return ["all", ...Array.from(set)];
  }, [inventoryList]);

  const filtered = useMemo(() => {
    return inventoryList.filter(item => {
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const matchSearch = !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [inventoryList, categoryFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">Multi-Batch Inventory & Valuation Guide:</p>
          <p className="text-slate-700 leading-relaxed">
            Each product holds multiple discrete procurement batches with fluctuating costs. Click <strong>"active lots"</strong> to expand and inspect each lot. The batch highlighted with <strong>★ Next to Bill</strong> has the lowest unit cost and will automatically be sold first.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sky-950">Store Inventory & Batches</h1>
          <p className="text-sm text-slate-600">View real-time stock levels, multi-price procurement lots, and valuation.</p>
        </div>
        <button
          onClick={onRefresh}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 hover:bg-sky-50 text-sky-900 text-xs font-bold transition-all"
        >
          Refresh Stock
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SKUs</span>
            <p className="text-2xl font-black text-sky-950 mt-1">{summary.total_products}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock Units</span>
            <p className="text-2xl font-black text-sky-600 mt-1">{summary.total_units}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Valuation (Cost)</span>
            <p className="text-2xl font-black text-teal-700 mt-1">{fmt(summary.total_valuation)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <p className={`text-2xl font-black mt-1 ${summary.low_stock_count > 0 ? "text-amber-700" : "text-slate-400"}`}>
              {summary.low_stock_count}
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none capitalize bg-sky-50/20"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table with Expandable Lots */}
      <div className="bg-white rounded-xl border border-sky-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/80 text-sky-950 text-xs font-bold uppercase tracking-wider border-b border-sky-200">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Weighted Avg Cost</th>
                <th className="py-3 px-4 text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Batches</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filtered.map(item => {
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className={`hover:bg-sky-50/40 transition-colors ${isExpanded ? "bg-sky-50/50" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-sky-950">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-sky-50 text-sky-900 border border-sky-200 font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StockBadge totalUnits={item.total_stock} reorderLevel={item.min_stock} unit={item.unit} />
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {fmt(item.avg_cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-teal-800">
                        {fmt(item.total_valuation)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition-colors"
                        >
                          <span>{item.lots ? item.lots.length : 0} active</span>
                          <Icon name={isExpanded ? "chevronUp" : "chevronDown"} className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => onSellProduct(item)}
                          disabled={item.total_stock <= 0}
                          className="text-xs font-bold px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white shadow-xs"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Batches Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-sky-50/30 border-t border-b border-sky-200">
                        <td colSpan="7" className="p-4">
                          <div className="bg-white rounded-xl border border-sky-200 p-4 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                              <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                                Active Procurement Batches for {item.name}
                              </h4>
                              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                Sorted: Lowest Cost First (Cheapest billed first on sale)
                              </span>
                            </div>

                            {(!item.lots || item.lots.length === 0) ? (
                              <p className="text-xs text-slate-500 py-2">No active stock lots in inventory.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-sky-50 text-sky-950 font-bold">
                                    <tr>
                                      <th className="py-2 px-2.5">Batch Code</th>
                                      <th className="py-2 px-2.5">Procurement Date</th>
                                      <th className="py-2 px-2.5">Source</th>
                                      <th className="py-2 px-2.5 text-right">Unit Cost (Cost Price)</th>
                                      <th className="py-2 px-2.5 text-right">Remaining Qty</th>
                                      <th className="py-2 px-2.5 text-right">Initial Qty</th>
                                      <th className="py-2 px-2.5 text-right">Lot Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-sky-50">
                                    {item.lots.map((lot, lIndex) => (
                                      <tr key={lot.id} className={lIndex === 0 ? "bg-sky-50/50" : ""}>
                                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                                          {lot.batch_code}
                                          {lIndex === 0 && (
                                            <span className="ml-2 text-[10px] bg-sky-100 text-sky-950 border border-sky-400 font-black px-2 py-0.5 rounded shadow-2xs">
                                              ★ Next to Bill (Lowest Cost)
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-slate-600">{lot.procurement_date}</td>
                                        <td className="py-2 px-2.5">
                                          <SourceBadge source={lot.source} />
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-black text-sky-950">
                                          {fmt(lot.unit_cost)}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-bold text-sky-700">
                                          {lot.remaining_qty} {item.unit}
                                        </td>
                                        <td className="py-2 px-2.5 text-right text-slate-400">
                                          {lot.initial_qty} {item.unit}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-bold text-teal-800">
                                          {fmt(lot.remaining_qty * lot.unit_cost)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 5. Sales Invoices History View
// ==============================================================================
function InvoicesHistoryView({ salesHistory, onViewInvoice }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return salesHistory;
    const s = search.toLowerCase();
    return salesHistory.filter(sale =>
      sale.invoice_no.toLowerCase().includes(s) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(s))
    );
  }, [salesHistory, search]);

  return (
    <div className="space-y-6">
      {/* Self-Explanatory Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0 font-bold text-base">
          💡
        </div>
        <div className="text-xs text-sky-950 space-y-1">
          <p className="font-bold text-sm text-sky-900">Sales Invoices & Receipts Ledger:</p>
          <p className="text-slate-700 leading-relaxed">
            Review historical customer invoices. Click <strong>"View Receipt"</strong> to preview or print complete customer bills with customer details, allocated lots, and exact profit margins.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sky-950">Sales Invoices History</h1>
          <p className="text-sm text-slate-600">Browse completed sales bills, inspect customer receipts, and review exact profit.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sky-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/80 text-sky-950 text-xs font-bold uppercase tracking-wider border-b border-sky-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Items / Units</th>
                <th className="py-3 px-4 text-right">Sale Amount</th>
                <th className="py-3 px-4 text-right">COGS (Cost)</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map(sale => {
                  const margin = sale.total_amount > 0 ? (sale.total_profit / sale.total_amount * 100).toFixed(1) : 0;
                  return (
                    <tr key={sale.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">
                        {sale.invoice_no}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sale.sale_date}</td>
                      <td className="py-3 px-4 font-bold text-sky-950">
                        {sale.customer_name || "Walk-in Customer"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {sale.items_count} items ({sale.total_qty} units)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {fmt(sale.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {fmt(sale.total_cogs)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ProfitBadge profit={sale.total_profit} margin={margin} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewInvoice(sale.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-colors"
                        >
                          <Icon name="printer" className="w-3.5 h-3.5" />
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 6. Manual Lot Selector Modal (Override Lowest Cost First)
// ==============================================================================
function LotSelectorModal({ context, onClose, onApply }) {
  const { item } = context;
  const [availableLots, setAvailableLots] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/lots?product_id=${item.product_id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setAvailableLots(res.lots);
          // Initialize allocations with existing ones if any
          const init = {};
          if (item.allocated_lots) {
            item.allocated_lots.forEach(l => {
              init[l.lot_id] = l.qty;
            });
          }
          setAllocations(init);
        }
      })
      .finally(() => setLoading(false));
  }, [item.product_id]);

  const minCostLotId = useMemo(() => {
    if (!availableLots.length) return null;
    const sorted = [...availableLots].sort((a, b) => a.unit_cost - b.unit_cost);
    return sorted[0]?.id;
  }, [availableLots]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [allocations]);

  const isValid = Math.abs(totalAllocated - item.qty) < 0.0001;

  const handleQtyChange = (lotId, qtyVal) => {
    const q = Number(qtyVal);
    setAllocations(prev => ({
      ...prev,
      [lotId]: q >= 0 ? q : 0
    }));
  };

  const handleSave = () => {
    const list = Object.entries(allocations)
      .map(([lotId, qty]) => ({ lot_id: Number(lotId), qty: Number(qty) }))
      .filter(l => l.qty > 0);
    onApply(list);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-sky-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-sky-100 text-sky-800">
                <Icon name="tag" className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-sky-950">Manual Lot Selection (Override)</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Billing item: <strong className="text-sky-950 font-bold">{item.product_name}</strong> ({item.sku})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Self-explanatory guidance banner */}
        <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-sky-900">
            <Icon name="info" className="w-3.5 h-3.5 text-sky-700" />
            <span>How manual lot override works:</span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            By default, the store automatically bills from the <strong>cheapest lot first [★]</strong>. If you wish to bill from a specific batch (e.g., older inventory or specific procurement price), enter the desired quantity per batch below.
          </p>
        </div>

        {/* Total required vs allocated */}
        <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-200 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-600 font-bold">Total Required:</span>{" "}
            <span className="font-bold text-sky-950">{item.qty} {item.unit}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-bold">Allocated:</span>{" "}
            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
              isValid ? "bg-emerald-100 text-emerald-950 border border-emerald-300" : "bg-rose-100 text-rose-950 border border-rose-300"
            }`}>
              <Icon name={isValid ? "checkCircle" : "alert"} className="w-3.5 h-3.5" />
              {totalAllocated} / {item.qty} {item.unit}
            </span>
          </div>
        </div>

        {/* Lots List */}
        <div className="max-h-64 overflow-y-auto divide-y divide-sky-100 border border-sky-200 rounded-lg">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-xs">Loading available batches...</div>
          ) : availableLots.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">No active batches available for this product.</div>
          ) : (
            availableLots.map(lot => {
              const currentVal = allocations[lot.id] || "";
              const isCheapest = lot.id === minCostLotId;
              return (
                <div key={lot.id} className={`p-3 flex items-center justify-between text-xs transition-colors ${
                  isCheapest ? "bg-sky-50/40" : "hover:bg-slate-50"
                }`}>
                  <div className="space-y-1">
                    <div className="font-mono font-bold text-sky-950 flex items-center gap-2 flex-wrap">
                      <span>{lot.batch_code}</span>
                      <SourceBadge source={lot.source} />
                      {isCheapest && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[10px] border border-sky-300">
                          <Icon name="star" className="w-3 h-3 text-sky-700" />
                          ★ Cheapest Batch (Auto-Default)
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Procured: {lot.procurement_date} | Remaining Stock: <strong className="text-sky-950">{lot.remaining_qty} {item.unit}</strong>
                    </div>
                    <div className="text-sky-900 font-bold text-xs">
                      Procurement Cost: {fmt(lot.unit_cost)}
                    </div>
                  </div>

                  <div className="w-28 pl-2">
                    <label className="text-[10px] text-slate-500 block text-right mb-0.5">Bill Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={lot.remaining_qty}
                      value={currentVal}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(lot.id, e.target.value)}
                      className="w-full border border-sky-300 rounded-md px-2 py-1.5 text-right font-bold text-sky-950 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isValid && (
          <p className="text-xs text-rose-700 font-bold text-center flex items-center justify-center gap-1">
            <Icon name="alert" className="w-3.5 h-3.5 text-rose-600" />
            Total allocated ({totalAllocated}) must exactly equal requested quantity ({item.qty})
          </p>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-sky-300 text-sky-900 hover:bg-sky-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white shadow-sm flex items-center gap-1.5"
          >
            <Icon name="checkCircle" className="w-3.5 h-3.5" />
            Apply Manual Lot
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 7. Printable Invoice Receipt Modal
// ==============================================================================
function InvoiceModal({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center no-print border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-sky-100 text-sky-800">
              <Icon name="printer" className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-950">Official Sales Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs"
            >
              <Icon name="printer" className="w-4 h-4" />
              Print Receipt
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" className="p-2 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-sky-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-sky-950">Apex Inventory Store</h2>
              <p className="text-xs text-slate-600">Retail & Wholesale Distribution • Multi-Batch Tracking</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-slate-500">Invoice Number</span>
              <div className="text-lg font-mono font-black text-sky-800">{invoice.invoice_no}</div>
              <div className="text-xs text-slate-600 mt-1">Date: <strong>{invoice.sale_date}</strong></div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-sky-50/50 p-3 rounded-xl border border-sky-200">
            <div>
              <span className="font-bold text-slate-600 uppercase">Customer:</span>
              <p className="font-bold text-sky-950 text-sm mt-0.5">{invoice.customer_name || "Walk-in Customer"}</p>
              {invoice.customer_phone && <p className="text-slate-600">Phone: {invoice.customer_phone}</p>}
            </div>
            <div className="text-right">
              {invoice.notes && (
                <>
                  <span className="font-bold text-slate-600 uppercase">Notes:</span>
                  <p className="text-slate-700 italic">{invoice.notes}</p>
                </>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left border border-sky-100 rounded-lg overflow-hidden">
            <thead className="bg-sky-100/70 text-sky-950 uppercase font-bold border-b border-sky-200">
              <tr>
                <th className="py-2.5 px-3">Item Description & Billed Lots</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {invoice.items && invoice.items.map((it, idx) => (
                <tr key={idx} className="hover:bg-sky-50/30">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-sky-950">{it.product_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{it.sku}</div>
                    {/* Billed batches info */}
                    {it.allocated_lots && (
                      <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-1">
                        {it.allocated_lots.map((l, li) => (
                          <span key={li} className="bg-sky-100/60 text-sky-900 border border-sky-200 px-1.5 py-0.5 rounded font-mono">
                            {l.qty}x from {l.batch_code} ({l.source})
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    {it.qty} {it.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                    {fmt(it.unit_sale_price)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sky-950">
                    {fmt(it.total_sale_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="border-t border-sky-200 pt-3 space-y-1 text-xs">
            <div className="flex justify-between font-bold text-base text-sky-950 pt-2 border-t border-sky-200">
              <span>Total Bill Amount:</span>
              <span className="text-sky-800 font-black text-lg">{fmt(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-2 text-[11px] no-print">
              <span>Cost of Goods (COGS): <strong>{fmt(invoice.total_cogs)}</strong></span>
              <span>
                Realized Net Profit:{" "}
                <strong className={invoice.total_profit >= 0 ? "text-emerald-800" : "text-rose-800"}>
                  {invoice.total_profit >= 0 ? "+" : ""}{fmt(invoice.total_profit)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 8. Quick Product Creation Modal
// ==============================================================================
function ProductModal({ onClose, onCreated, showToast }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [unit, setUnit] = useState("pcs");
  const [minStock, setMinStock] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const presetCategories = ["Electronics", "Accessories", "Groceries", "Audio", "Home & Office", "Apparel", "General"];
  const presetUnits = ["pcs", "box", "kg", "bag", "pack", "liter"];

  const generateAutoSku = () => {
    const prefix = (category.substring(0, 3) || "PRD").toUpperCase();
    const cleanName = (name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3) || "ITM").toUpperCase();
    const num = Math.floor(10 + Math.random() * 90);
    setSku(`${prefix}-${cleanName}-${num}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !sku) {
      showToast("Product name and SKU are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sku, category, unit, min_stock: Number(minStock) })
      }).then(r => r.json());

      if (res.success) {
        onCreated({ id: res.id, name, sku, category, unit });
      } else {
        showToast(res.error || "Failed to create product", "error");
      }
    } catch (e) {
      showToast("Error creating product", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-sky-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-sky-950">Add Product to Catalogue</h3>
            <p className="text-xs text-slate-600">Register a new product SKU in your master catalogue.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Wireless Ergonomic Mouse"
              className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-bold text-slate-700 uppercase">
                  SKU / Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateAutoSku}
                  className="text-[10px] text-sky-700 font-bold hover:underline"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="E.g. TECH-MOU-05"
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none uppercase bg-sky-50/20 font-bold text-sky-950"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category name"
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
            </div>
          </div>

          {/* Preset Category Chips */}
          <div>
            <span className="text-[11px] text-slate-600 font-bold block mb-1">Quick Select Category:</span>
            <div className="flex flex-wrap gap-1.5">
              {presetCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                    category === cat
                      ? "bg-sky-100 border-sky-400 text-sky-900 shadow-2xs"
                      : "bg-sky-50/50 border-sky-200 text-sky-950 hover:bg-sky-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Unit of Measure</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, box, kg..."
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {presetUnits.map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      unit === u ? "bg-sky-100 border-sky-400 text-sky-900" : "bg-sky-50/50 border-sky-200 text-slate-600"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Low Stock Threshold</label>
              <input
                type="number"
                min="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Alerts you when remaining units fall below this.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-sky-300 text-sky-900 hover:bg-sky-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              {submitting ? "Saving to Catalogue..." : "Save to Catalogue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// 9. Quick Customer Creation Modal
// ==============================================================================
function CustomerModal({ onClose, onCreated, showToast }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      showToast("Customer name is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, address })
      }).then(r => r.json());

      if (res.success) {
        onCreated({ id: res.id, name, phone, email });
      } else {
        showToast(res.error || "Failed to create customer", "error");
      }
    } catch (e) {
      showToast("Error creating customer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-sky-100 text-sky-800">
              <Icon name="users" className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-sky-950">Add Customer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Customer / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Metro Enterprises / John Doe"
              className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0199"
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.com"
                className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Address / Billing Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, state, or office suite..."
              className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-sky-300 text-sky-900 hover:bg-sky-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5"
            >
              <Icon name="checkCircle" className="w-3.5 h-3.5" />
              {submitting ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// 10. Audit Trail Drill-Down Modal
// ==============================================================================
function ItemDetailModal({ product, onClose }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/lots?product_id=${product.product_id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setLots(res.lots);
      })
      .finally(() => setLoading(false));
  }, [product.product_id]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-sky-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-sky-100 text-sky-800">
                <Icon name="tag" className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-sky-950">Audit Trail: {product.product_name}</h3>
            </div>
            <p className="text-xs text-slate-600 font-mono mt-0.5">{product.sku} | Category: {product.category}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-3 text-xs bg-sky-50/50 p-3 rounded-xl border border-sky-200">
          <div>
            <span className="text-slate-600 font-bold">Units Sold:</span>
            <div className="font-bold text-sky-950 text-sm mt-0.5">{product.units_sold} {product.unit}</div>
          </div>
          <div>
            <span className="text-slate-600 font-bold">Total Realized Profit:</span>
            <div className="font-bold text-emerald-800 text-sm mt-0.5">{fmt(product.profit)}</div>
          </div>
          <div>
            <span className="text-slate-600 font-bold">Profit Margin:</span>
            <div className="font-bold text-emerald-800 text-sm mt-0.5">{product.margin_pct}%</div>
          </div>
        </div>

        {/* Active Lots */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="inventory" className="w-3.5 h-3.5 text-sky-700" />
            <span>Active Inventory Batches for this Product</span>
          </h4>
          <div className="border border-sky-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-sky-100/70 text-sky-950 font-bold border-b border-sky-200">
                <tr>
                  <th className="py-2 px-3">Batch Code</th>
                  <th className="py-2 px-3">Procured Date</th>
                  <th className="py-2 px-3">Source Channel</th>
                  <th className="py-2 px-3 text-right">Procurement Cost</th>
                  <th className="py-2 px-3 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {loading ? (
                  <tr><td colSpan="5" className="py-4 text-center text-slate-500">Loading batch details...</td></tr>
                ) : lots.length === 0 ? (
                  <tr><td colSpan="5" className="py-4 text-center text-slate-500">No active batches remaining.</td></tr>
                ) : (
                  lots.map(l => (
                    <tr key={l.id} className="hover:bg-sky-50/30">
                      <td className="py-2 px-3 font-mono font-bold text-sky-950">{l.batch_code}</td>
                      <td className="py-2 px-3 text-slate-600">{l.procurement_date}</td>
                      <td className="py-2 px-3"><SourceBadge source={l.source} /></td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">{fmt(l.unit_cost)}</td>
                      <td className="py-2 px-3 text-right font-bold text-sky-800">{l.remaining_qty} {product.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-sky-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-700 hover:bg-sky-600 text-white shadow-xs"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 11. Accessibility & Visual Legend Modal (Color-Blind Friendly Guide)
// ==============================================================================
function AccessibilityModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-sky-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-sky-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-100 text-sky-800">
                <Icon name="info" className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-sky-950">Accessibility & Visual Legend Guide</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Universal design guidelines, color-blind friendly symbols, and self-explanatory workflows.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Section: Color Blind Assurance */}
        <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 text-xs space-y-2">
          <div className="font-bold text-sky-950 flex items-center gap-2">
            <Icon name="checkCircle" className="w-4 h-4 text-sky-700" />
            <span>WCAG 2.1 AA/AAA Compliant — No Information Relies On Color Alone</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Every status, financial figure, batch allocation, and inventory state in this application is designed for users with <strong>Deuteranopia (green-blind), Protanopia (red-blind), Tritanopia (blue-blind), or Monochromacy</strong>. 
            All indicators pair a <strong>unique vector icon</strong>, an <strong>explicit text label</strong>, and a <strong>high-contrast border</strong> so you never have to guess based on color.
          </p>
        </div>

        {/* Section: Stock Status Badges */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="inventory" className="w-3.5 h-3.5 text-sky-700" />
            <span>1. Stock Level Status Indicators</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <Icon name="checkCircle" className="w-4 h-4 text-emerald-700" />
                <span>✓ In Stock</span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-snug">
                Stock is well above your alert threshold. Available for sales.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/60 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Icon name="alert" className="w-4 h-4 text-amber-700" />
                <span>⚠ Low Stock</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-snug">
                Units remaining have dropped to or below minimum threshold. Restock recommended.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-rose-300 bg-rose-50/60 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-950">
                <Icon name="xCircle" className="w-4 h-4 text-rose-700" />
                <span>✕ Out of Stock</span>
              </div>
              <p className="text-[11px] text-rose-900 leading-snug">
                Depleted to 0 units. POS sales will be blocked until new stock is procured.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Procurement Sources */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="procure" className="w-3.5 h-3.5 text-sky-700" />
            <span>2. Multi-Channel Procurement Sources</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-sky-200 bg-white flex items-center gap-3">
              <SourceBadge source="Wholesale Shop" />
              <div className="text-[11px] text-slate-700">
                <strong>Wholesale Shop:</strong> Direct supplier or wholesale market procurement.
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-sky-200 bg-white flex items-center gap-3">
              <SourceBadge source="Quick Commerce" />
              <div className="text-[11px] text-slate-700">
                <strong>Quick Commerce:</strong> Hyperlocal instant couriers (Blinkit, Zepto, etc.).
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-sky-200 bg-white flex items-center gap-3">
              <SourceBadge source="E-Commerce" />
              <div className="text-[11px] text-slate-700">
                <strong>E-Commerce:</strong> Online marketplaces (Amazon, Flipkart, Shopify, etc.).
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-sky-200 bg-white flex items-center gap-3">
              <SourceBadge source="Other" />
              <div className="text-[11px] text-slate-700">
                <strong>Other:</strong> Custom, ad-hoc, or miscellaneous inventory acquisition.
              </div>
            </div>
          </div>
        </div>

        {/* Section: Costing & Allocation Rules */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="tag" className="w-3.5 h-3.5 text-sky-700" />
            <span>3. Batch Costing & Billing Allocation Strategy</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-950">
                <span className="p-1 rounded bg-sky-200 text-sky-900">
                  <Icon name="star" className="w-3.5 h-3.5" />
                </span>
                <span>★ Lowest-Cost-First (Cheapest-First)</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Default automated allocation. The system automatically bills from the lot with the lowest procurement cost first to maximize realized net profit. If a sale exceeds a single lot, it splits seamlessly across the next lowest batches.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-950">
                <span className="p-1 rounded bg-sky-200 text-sky-900">
                  <Icon name="tag" className="w-3.5 h-3.5" />
                </span>
                <span>⚙ Manual Lot Selection Override</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Salesperson can click 'Change Batch' in the POS cart to hand-pick specific batches (for example, billing a lot procured at $65 instead of $50). Cross-product lot leakage is strictly prevented.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Financial & Profit Metrics */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="trending" className="w-3.5 h-3.5 text-sky-700" />
            <span>4. Profit & Loss Metrics</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
              <div>
                <strong className="text-emerald-950 block">Profitable Sale:</strong>
                <span className="text-[11px] text-slate-600">Revenues exceed Cost of Goods Sold.</span>
              </div>
              <ProfitBadge profit={125.50} margin={28.4} />
            </div>

            <div className="p-3 rounded-lg border border-rose-300 bg-rose-50/50 flex items-center justify-between">
              <div>
                <strong className="text-rose-950 block">Loss Warning:</strong>
                <span className="text-[11px] text-slate-600">Sale price below procurement cost.</span>
              </div>
              <ProfitBadge profit={-15.00} margin={-4.2} />
            </div>
          </div>
        </div>

        {/* Section: Light Blue Color Scheme Advantage */}
        <div className="p-3.5 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 text-xs space-y-1.5">
          <h5 className="font-bold text-sky-950 flex items-center gap-1.5">
            <Icon name="star" className="w-3.5 h-3.5 text-sky-600" />
            <span>Accessible Light Blue Visual Experience</span>
          </h5>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            The light blue palette utilizes clean ambient backgrounds (<code className="font-mono text-sky-900">#f8fbff</code>) with deep slate typography (<code className="font-mono text-sky-900">#082f49</code>), eliminating eye fatigue during prolonged retail shifts and achieving contrast ratios greater than 7:1 (exceeding WCAG AAA criteria).
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2 border-t border-sky-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm flex items-center gap-1.5"
          >
            <Icon name="checkCircle" className="w-3.5 h-3.5" />
            Got it, return to store
          </button>
        </div>
      </div>
    </div>
  );
}

// Mount the React Application
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
