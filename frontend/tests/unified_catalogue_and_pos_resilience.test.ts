import fs from 'fs';
import path from 'path';

describe('PR-030: Unified Catalogue, Procurement Rate & Resilient POS Order Completion', () => {
  const cataloguePath = path.resolve(__dirname, '../app/catalogue/page.tsx');
  const salesPath = path.resolve(__dirname, '../app/sales/page.tsx');

  test('1. Catalogue displays Procurement Rate (Cost), Current Stock, and Quick Actions columns', () => {
    const content = fs.readFileSync(cataloguePath, 'utf8');
    expect(content).toContain('Procurement Rate (Cost)');
    expect(content).toContain('Current Stock');
    expect(content).toContain('Stock Status');
    expect(content).toContain('Quick Actions');
    expect(content).toContain('Available Stock');
    expect(content).toContain('Inventory Valuation');
  });

  test('2. Catalogue includes Quick Restock modal with quantity, cost, source, and submit handler', () => {
    const content = fs.readFileSync(cataloguePath, 'utf8');
    expect(content).toContain('openRestockModal');
    expect(content).toContain('handleExecuteRestock');
    expect(content).toContain('Quick Restock Batch');
    expect(content).toContain('Confirm & Intake Stock');
    expect(content).toContain('latestProcurementCost');
  });

  test('3. POS Billing handleCheckout includes allow_backlog: true and displays backlog badge', () => {
    const content = fs.readFileSync(salesPath, 'utf8');
    expect(content).toContain('allow_backlog: true');
    expect(content).toContain('Stock backlog:');
    expect(content).toContain('Complete Sale & Print Receipt');
  });
});
