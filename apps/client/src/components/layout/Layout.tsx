import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  showBack?: boolean;
  fullWidth?: boolean;
}

export function Layout({ children, showBack, fullWidth }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showBack={showBack} />
      <main className={`flex-1 ${fullWidth ? 'flex flex-col min-h-0' : 'container mx-auto px-4 py-6 sm:py-8'}`}>{children}</main>
      {!fullWidth && (
        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          Connectra &copy; {new Date().getFullYear()}
        </footer>
      )}
    </div>
  );
}
