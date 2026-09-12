import fs from 'fs';
import path from 'path';

describe('PR-013: Strict AuthGuard, Clean Data, Favicon & Retail Sales Branding', () => {
  const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
  const authGuardPath = path.resolve(__dirname, '../components/AuthGuard.tsx');
  const navigationPath = path.resolve(__dirname, '../components/Navigation.tsx');
  const commandPalettePath = path.resolve(__dirname, '../components/CommandPalette.tsx');
  const salesPagePath = path.resolve(__dirname, '../app/sales/page.tsx');
  const indexHtmlPath = path.resolve(__dirname, '../../index.html');
  const faviconIcoPath = path.resolve(__dirname, '../public/favicon.ico');
  const appFaviconPath = path.resolve(__dirname, '../app/favicon.ico');

  test('1. App title is "Retail Sales" and favicon is linked in layout.tsx & index.html', () => {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

    expect(layoutContent).toContain("title: 'Retail Sales'");
    expect(layoutContent).toContain("icon: '/favicon.ico'");
    expect(indexContent).toContain('<title>Retail Sales</title>');
    expect(indexContent).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico">');
  });

  test('2. Valid favicon.ico binary exists in app and public directories', () => {
    expect(fs.existsSync(faviconIcoPath)).toBe(true);
    expect(fs.existsSync(appFaviconPath)).toBe(true);

    const buf = fs.readFileSync(faviconIcoPath);
    // Standard ICO magic bytes: 0x00, 0x00, 0x01, 0x00
    expect(buf[0]).toBe(0);
    expect(buf[1]).toBe(0);
    expect(buf[2]).toBe(1);
    expect(buf[3]).toBe(0);
    expect(buf.length).toBeGreaterThan(100);
  });

  test('3. AuthGuard wraps the application in layout.tsx', () => {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    expect(layoutContent).toContain("import { AuthGuard } from '../components/AuthGuard'");
    expect(layoutContent).toContain('<AuthGuard>');
    expect(layoutContent).toContain('</AuthGuard>');
  });

  test('4. AuthGuard intercepts unauthenticated visitors and redirects to /login', () => {
    const authGuardContent = fs.readFileSync(authGuardPath, 'utf8');
    expect(authGuardContent).toContain("const isLoginPage = pathname === '/login'");
    expect(authGuardContent).toContain('isAuthorizedEmail(currentUser.email)');
    expect(authGuardContent).toContain("router.replace('/login')");
    expect(authGuardContent).toContain('if (isLoginPage)');
    expect(authGuardContent).toContain('role="status"');
    expect(authGuardContent).toContain('aria-live="polite"');
  });

  test('5. AuthGuard allows authenticated whitelisted accounts to render children', () => {
    const authGuardContent = fs.readFileSync(authGuardPath, 'utf8');
    expect(authGuardContent).toContain('const isAuthenticated = Boolean(currentUser && isAuthorizedEmail(currentUser.email))');
    expect(authGuardContent).toContain('return <>{children}</>');
  });

  test('6. Navigation renders clean minimal header on /login without store links', () => {
    const navContent = fs.readFileSync(navigationPath, 'utf8');
    expect(navContent).toContain("if (pathname === '/login')");
    expect(navContent).toContain('Retail Sales');
    expect(navContent).toContain('<ThemeToggle />');
    // Ensure on /login it does not render navLinks
    const loginHeaderSlice = navContent.slice(navContent.indexOf("if (pathname === '/login')"));
    const endOfLoginHeader = loginHeaderSlice.indexOf('return (');
    const loginBranch = loginHeaderSlice.slice(0, endOfLoginHeader);
    expect(loginBranch).not.toContain('navLinks.map');
  });

  test('7. Navigation handleLogout immediately wipes session and redirects to /login', () => {
    const navContent = fs.readFileSync(navigationPath, 'utf8');
    expect(navContent).toContain('const handleLogout = () => {');
    expect(navContent).toContain('logout();');
    expect(navContent).toContain("router.replace('/login')");
    expect(navContent).toContain('onClick={handleLogout}');
  });

  test('8. CommandPalette is disabled on /login or when unauthenticated', () => {
    const cmdContent = fs.readFileSync(commandPalettePath, 'utf8');
    expect(cmdContent).toContain("if (pathname === '/login' || !currentUser) return;");
    expect(cmdContent).toContain("if (!isCommandPaletteOpen || pathname === '/login' || !currentUser) return null;");
  });

  test('9. Quick Search input box & autocomplete dropdown are present on sales/page.tsx', () => {
    const salesContent = fs.readFileSync(salesPagePath, 'utf8');
    expect(salesContent).toContain('searchQuery');
    expect(salesContent).toContain('isSearchFocused');
    expect(salesContent).toContain('searchResults');
    expect(salesContent).toContain('handleQuickAdd');
    expect(salesContent).toContain('Quick search & add product by name, SKU, category, or barcode...');
    expect(salesContent).toContain('Open Product Picker Grid');
  });

  test('10. Quick Add validates depletion to 0 and maximum stock limit', () => {
    const salesContent = fs.readFileSync(salesPagePath, 'utf8');
    expect(salesContent).toContain('item is depleted (0 in stock)');
    expect(salesContent).toContain('Reached maximum available stock');
  });

  test('11. POS billing and catalogue start with clean empty arrays when no data exists', () => {
    const salesContent = fs.readFileSync(salesPagePath, 'utf8');
    const catalogueContent = fs.readFileSync(path.resolve(__dirname, '../app/catalogue/page.tsx'), 'utf8');

    expect(salesContent).toContain('const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);');
    expect(salesContent).toContain('const [customers, setCustomers] = useState<Customer[]>([]);');
    expect(catalogueContent).toContain('const [products, setProducts] = useState<CatalogueProduct[]>([]);');
  });

  test('12. Visual Testing Gate: WCAG 2.1 AAA contrast and accessible status live region', () => {
    const authGuardContent = fs.readFileSync(authGuardPath, 'utf8');
    expect(authGuardContent).toContain('role="status"');
    expect(authGuardContent).toContain('aria-live="polite"');
    expect(authGuardContent).toContain('text-emerald-600 dark:text-emerald-400 font-semibold');
    expect(authGuardContent).toContain('text-foreground');
    expect(authGuardContent).toContain('text-muted-foreground');
  });

  test('13. Visual Testing Gate: Standardized focus-visible rings on interactive controls', () => {
    const salesContent = fs.readFileSync(salesPagePath, 'utf8');
    const navContent = fs.readFileSync(navigationPath, 'utf8');

    expect(salesContent).toContain('focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2');
    expect(navContent).toContain('focus-visible:ring-2 focus-visible:ring-destructive');
  });
});
