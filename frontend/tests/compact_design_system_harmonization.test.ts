import fs from 'fs';
import path from 'path';

describe('PR-035 App-Wide Density & Design System Harmonization Suite', () => {
  const rootDir = path.resolve(__dirname, '..');

  const readComponent = (relPath: string) => {
    return fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
  };

  describe('1. Mobile POS Catalogue Name Truncation Fix (sales/page.tsx)', () => {
    const salesContent = readComponent('app/sales/page.tsx');

    test('renders mobile full-width product name container with unit badge and top-right delete button', () => {
      expect(salesContent).toContain('sm:hidden');
      expect(salesContent).toContain('hidden sm:inline-flex');
      expect(salesContent).toContain('font-bold text-xs sm:text-sm text-foreground');
      expect(salesContent).toContain('Qty');
      expect(salesContent).toContain('Price');
      expect(salesContent).toContain('lineTotal');
    });

    test('preserves mandatory date & customer selection with empty defaults', () => {
      expect(salesContent).toContain("const [saleDate, setSaleDate] = useState<string>('')");
      expect(salesContent).toContain("const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)");
      expect(salesContent).toContain('Please select a customer');
      expect(salesContent).toContain('Please select a sale order date');
    });
  });

  describe('2. Analytics Promotional Header Removal & Compact Top Bar (analytics/page.tsx)', () => {
    const analyticsContent = readComponent('app/analytics/page.tsx');

    test('completely removes bulky promotional header and promotional text', () => {
      expect(analyticsContent).not.toContain('FINANCIAL REPORTING ENGINE');
      expect(analyticsContent).not.toContain('Profit & Sales Analytics');
      expect(analyticsContent).not.toContain('Day-to-year granular reporting');
    });

    test('integrates compact top bar with Analytics badge and day/week/month/year granularity buttons', () => {
      expect(analyticsContent).toContain('Top Compact Bar: Analytics Badge + Granularity Switcher');
      expect(analyticsContent).toContain('h-9 rounded-xl bg-card border border-border');
      expect(analyticsContent).toContain('setGranularity(g)');
      expect(analyticsContent).toContain('granularity === g');
    });

    test('harmonizes KPI cards and table padding to compact standards', () => {
      expect(analyticsContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(analyticsContent).toContain('px-3.5 py-2 font-semibold text-foreground');
      expect(analyticsContent).toContain('Financial Timeline & Performance Ledger');
      expect(analyticsContent).toContain('Catalogue Item Profitability');
    });
  });

  describe('3. Past Orders & Invoices Compact Harmonization (orders/page.tsx)', () => {
    const ordersContent = readComponent('app/orders/page.tsx');

    test('contains compact header with w-8 h-8 icon and text-base sm:text-lg font-bold', () => {
      expect(ordersContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(ordersContent).toContain('text-base sm:text-lg font-bold tracking-tight text-foreground');
      expect(ordersContent).toContain('Past Orders & Invoices');
    });

    test('contains h-8.5 buttons and inputs in toolbar and table', () => {
      expect(ordersContent).toContain('h-8.5 px-3 py-1.5 rounded-xl border border-border text-xs font-bold');
      expect(ordersContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
      expect(ordersContent).toContain('w-full h-8.5 pl-8.5 pr-8 py-1.5 rounded-xl border border-border');
    });

    test('preserves compact KPI cards and table cell padding', () => {
      expect(ordersContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs min-w-0 overflow-hidden');
      expect(ordersContent).toContain('px-3.5 py-2.5');
      expect(ordersContent).toContain('handleViewReceipt');
      expect(ordersContent).toContain('handleEditOrder');
    });
  });

  describe('4. Procurement & Batch Intake Compact Harmonization (procurement/page.tsx)', () => {
    const procContent = readComponent('app/procurement/page.tsx');

    test('contains compact header and h-8.5 action button', () => {
      expect(procContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(procContent).toContain('text-base sm:text-lg font-bold tracking-tight text-foreground');
      expect(procContent).toContain('Procurement & Batch Intake');
      expect(procContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
    });

    test('contains compact KPI stats and filter toolbar', () => {
      expect(procContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(procContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1 text-xs');
      expect(procContent).toContain('h-8.5 px-3 py-1 rounded-xl text-xs font-semibold');
    });

    test('contains compact table cells and preserves editable drawer handlers', () => {
      expect(procContent).toContain('px-3.5 py-2.5');
      expect(procContent).toContain('openCreateDrawer');
      expect(procContent).toContain('openEditDrawer');
    });
  });

  describe('5. Operating Charges & Expenses Compact Harmonization (charges/page.tsx)', () => {
    const chargesContent = readComponent('app/charges/page.tsx');

    test('contains compact header with w-8 h-8 icon and h-8.5 Record Charge button', () => {
      expect(chargesContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(chargesContent).toContain('text-base sm:text-lg font-bold tracking-tight text-foreground');
      expect(chargesContent).toContain('Business Charges & Expenses');
      expect(chargesContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
    });

    test('contains compact KPI cards and search filter bar', () => {
      expect(chargesContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(chargesContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1');
      expect(chargesContent).toContain('h-8.5 px-3 bg-primary text-primary-foreground text-xs font-bold');
    });

    test('contains compact table cells and action buttons', () => {
      expect(chargesContent).toContain('px-3.5 py-2.5 whitespace-nowrap font-mono text-xs font-semibold text-foreground');
      expect(chargesContent).toContain('openEditDrawer');
      expect(chargesContent).toContain('setDeleteTarget');
    });
  });

  describe('6. Catalogue & Rates Compact Harmonization (catalogue/page.tsx)', () => {
    const catContent = readComponent('app/catalogue/page.tsx');

    test('contains compact header and preserves all test identifiers', () => {
      expect(catContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(catContent).toContain('Product Catalogue & Rates');
      expect(catContent).toContain('Available Stock');
      expect(catContent).toContain('Inventory Valuation');
      expect(catContent).toContain('Procurement Rate (Cost)');
      expect(catContent).toContain('Stock Status');
      expect(catContent).toContain('Quick Actions');
      expect(catContent).toContain('Restock');
      expect(catContent).toContain('openRestockModal');
    });

    test('contains compact KPI cards and search bar', () => {
      expect(catContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(catContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1 text-xs');
      expect(catContent).toContain('px-2.5 py-1 rounded-lg text-xs font-semibold');
    });

    test('contains compact table padding and cells', () => {
      expect(catContent).toContain('px-3.5 py-2.5');
    });
  });

  describe('7. Master Entities: Customers, Suppliers & Categories', () => {
    const customersContent = readComponent('app/customers/page.tsx');
    const suppliersContent = readComponent('app/suppliers/page.tsx');
    const categoriesContent = readComponent('app/categories/page.tsx');

    test('customers page has compact header, KPIs, search, and table cells', () => {
      expect(customersContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(customersContent).toContain('Customer Directory');
      expect(customersContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
      expect(customersContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(customersContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1 text-xs');
      expect(customersContent).toContain('px-3.5 py-2.5');
    });

    test('suppliers page has compact header, KPIs, search, and table cells', () => {
      expect(suppliersContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(suppliersContent).toContain('Supplier & Vendor Directory');
      expect(suppliersContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
      expect(suppliersContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(suppliersContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1 text-xs');
      expect(suppliersContent).toContain('px-3.5 py-2.5');
    });

    test('categories page has compact header, KPIs, search, and tree panel', () => {
      expect(categoriesContent).toContain('w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0');
      expect(categoriesContent).toContain('Category Hierarchy');
      expect(categoriesContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
      expect(categoriesContent).toContain('p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs');
      expect(categoriesContent).toContain('w-full h-8.5 pl-8.5 pr-3 py-1 text-xs');
      expect(categoriesContent).toContain('p-3.5 sm:p-4 shadow-xs');
    });
  });

  describe('8. Product Picker Modal (components/ProductPickerModal.tsx)', () => {
    const pickerContent = readComponent('components/ProductPickerModal.tsx');

    test('has compact modal header with w-8 h-8 icon and close button', () => {
      expect(pickerContent).toContain('w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs');
      expect(pickerContent).toContain('text-base sm:text-lg font-bold tracking-tight text-foreground');
      expect(pickerContent).toContain('Advanced Product Picker & Multi-Attribute Grid');
    });

    test('has compact search, in-stock toggle, and category badges', () => {
      expect(pickerContent).toContain('w-full h-8.5 pl-8.5 pr-8 py-1 text-xs');
      expect(pickerContent).toContain('px-2.5 h-8.5 rounded-xl');
    });

    test('has compact data grid headers and rows with h-7 inputs', () => {
      expect(pickerContent).toContain('px-3.5 py-2');
      expect(pickerContent).toContain('w-20');
      expect(pickerContent).toContain('w-14 h-7');
    });

    test('has compact modal footer with h-8.5 buttons', () => {
      expect(pickerContent).toContain('h-8.5 px-3 py-1 rounded-xl border border-border text-xs font-semibold');
      expect(pickerContent).toContain('h-8.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold');
    });
  });
});
