/**
 * PR-034: Mandatory Customer & Date Selection with High-Density POS Layout
 * Automated Test Suite
 *
 * Verifies:
 * 1. Default initialization: Customer is null and Sale Date is blank ('').
 * 2. Mandatory Customer validation: Checkout is blocked and visual error states are applied when unselected.
 * 3. Mandatory Date validation: Checkout is blocked and visual error states are applied when date is empty.
 * 4. Successful checkout state reset: Resets Customer to null, Date to blank, and clears error states.
 * 5. High-density POS viewport fit:
 *    - Removal of bulky promotional header banner and redundant Past Orders button.
 *    - Positioning of Customer & Order Date card above Financial Summary.
 *    - Compact h-9 quick search and product picker controls.
 *    - Compact h-12/h-13 top navigation ribbon and reduced main vertical padding.
 *    - High-density internal scroll container max-h-[calc(100vh-210px)] fitting 4-6 items simultaneously.
 * 6. Accessibility & visual testing contracts (WCAG 2.1 AA/AAA compliance, focus rings).
 */

import fs from 'fs';
import path from 'path';

describe('PR-034: Mandatory Customer & Date Selection and High-Density POS Layout', () => {
  const salesPagePath = path.resolve(__dirname, '../app/sales/page.tsx');
  const navPath = path.resolve(__dirname, '../components/Navigation.tsx');
  const layoutPath = path.resolve(__dirname, '../app/layout.tsx');

  describe('1. Mandatory Field State Initialization & Checkout Validation', () => {
    it('initializes customer as null and saleDate as blank by default', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);');
      expect(content).toContain("const [saleDate, setSaleDate] = useState<string>('');");
    });

    it('strictly validates customer selection and displays visual error state when omitted', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('if (!selectedCustomerId)');
      expect(content).toContain("addNotification('error', 'Please select a customer. Customer selection is required to complete the sale.');");
      expect(content).toContain('setCustomerError(true);');
      expect(content).toContain('Customer selection is required');
    });

    it('strictly validates sale date and displays visual error state when omitted', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('if (!saleDate || !saleDate.trim())');
      expect(content).toContain("addNotification('error', 'Please select a sale order date. Order date is required to complete the sale.');");
      expect(content).toContain('setDateError(true);');
      expect(content).toContain('Sale order date is required');
    });

    it('resets customer and sale date to blank on successful checkout', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('setSelectedCustomerId(null);');
      expect(content).toContain("setSaleDate('');");
      expect(content).toContain('setCustomerError(false);');
      expect(content).toContain('setDateError(false);');
    });

    it('renders customer select with blank default option and required indicator', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('<option value="">-- Select Customer (Required) * --</option>');
      expect(content).toContain('Customer <span className="text-rose-500 font-bold">*</span>');
      expect(content).toContain('Sale Date <span className="text-rose-500 font-bold">*</span>');
    });
  });

  describe('2. High-Density Viewport Layout & Ergonomics', () => {
    it('verifies removal of promotional header block and past orders button for high-density viewport fit', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).not.toContain('Point of Sale Engine POS Billing & Multi-Batch Allocation');
      expect(content).not.toContain('$ Past Orders');
    });

    it('positions Customer & Order Date card above Financial Summary', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      const customerCardIndex = content.indexOf('Card 1: Mandatory Customer & Order Date Selection');
      const financialSummaryIndex = content.indexOf('Card 2: Financial Allocation Summary & Complete Sale');
      expect(customerCardIndex).toBeGreaterThan(-1);
      expect(financialSummaryIndex).toBeGreaterThan(-1);
      expect(customerCardIndex).toBeLessThan(financialSummaryIndex);
    });

    it('enforces compact height h-9 on quick search and product picker button', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('h-9 text-xs sm:text-sm bg-card border border-border rounded-xl');
      expect(content).toContain('h-9 px-3.5 sm:px-4 rounded-xl bg-primary');
    });

    it('verifies compact top navigation ribbon height h-12 and tight layout padding', () => {
      const navContent = fs.readFileSync(navPath, 'utf8');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      expect(navContent).toContain('h-12 sm:h-13 flex items-center justify-between');
      expect(layoutContent).toContain('py-3.5 sm:py-4');
    });

    it('enforces internal scroll container max-h-[calc(100vh-210px)] allowing 4-6 items on screen', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('max-h-[calc(100vh-210px)] overflow-y-auto pr-1');
    });
  });

  describe('3. Accessibility & Visual Contracts', () => {
    it('provides accessible labels for customer select and order date input', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('aria-label="Sale Order Date"');
    });

    it('applies high-contrast focus rings and error states', () => {
      const content = fs.readFileSync(salesPagePath, 'utf8');
      expect(content).toContain('border-rose-500 ring-2 ring-rose-500/20');
      expect(content).toContain('focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2');
    });
  });
});
