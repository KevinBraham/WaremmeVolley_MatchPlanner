import './globals.css';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'Waremme Volley - Match Planner',
  description: 'Planification des événements et tâches pour Waremme Volley',
  themeColor: '#002040',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-screen bg-background-secondary antialiased">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}