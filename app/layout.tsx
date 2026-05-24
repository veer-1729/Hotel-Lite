import './globals.css';

import Link from 'next/link';
import { Analytics } from '@vercel/analytics/react';
import { AuthNav } from '@/components/auth-nav';
import { appName } from '@/lib/config/runtime';

export const metadata = {
  title: `${appName} — Hotel Reservations`,
  description:
    'Healthy baseline hotel reservation app for incident-gym RCA evaluation.'
};

function SiteNav() {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/reservations', label: 'Reservations' }
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          {appName}
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col">
        <SiteNav />
        <div className="flex-1">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
