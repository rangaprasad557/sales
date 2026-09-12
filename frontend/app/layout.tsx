import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Navigation } from '../components/Navigation';
import { CommandPalette } from '../components/CommandPalette';

export const metadata: Metadata = {
  title: 'Apex POS | Multi-Batch Inventory & Sales Engine',
  description: 'Enterprise-grade Lowest-Cost-First multi-batch sales, procurement intake, and granular analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="relative min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <CommandPalette />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
