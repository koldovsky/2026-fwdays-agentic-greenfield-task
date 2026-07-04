'use client';

import { useState } from 'react';
import Link from 'next/link';
import { instructions } from '@/lib/instructions-data';

interface KbClientProps {
  initialTab: string;
}

export default function KbClient({ initialTab }: KbClientProps) {
  const [activeTabId, setActiveTabId] = useState(initialTab);

  const activeInstruction = instructions.find((inst) => inst.id === activeTabId) || instructions[0];

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    // Update URL query parameter without page reload
    window.history.pushState(null, '', `/kb?tab=${tabId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-page font-sans text-text-primary">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-bg-card px-8 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-display text-xl font-medium tracking-tight text-text-primary hover:text-accent-blue transition-colors duration-200">
            aControl
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-3 py-1.5 font-sans text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Головна
            </Link>
            <Link
              href="/login"
              className="border border-border-custom bg-transparent px-3 py-1.5 font-sans text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary cursor-pointer animate-fade-in"
            >
              Увійти
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary mb-3">
            База знань
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl">
            Покрокові практичні інструкції українською мовою для налаштування синхронізації конверсій та інтеграції аналітичних систем.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <nav className="flex overflow-x-auto md:overflow-x-visible md:flex-col border-b md:border-b-0 md:border-r border-border-custom pb-4 md:pb-0 md:pr-4 gap-2 whitespace-nowrap scrollbar-none">
            {instructions.map((inst) => {
              const isActive = inst.id === activeTabId;
              return (
                <button
                  key={inst.id}
                  onClick={() => handleTabChange(inst.id)}
                  className={`px-4 py-3 text-left text-xs font-medium transition-all duration-200 rounded-sm cursor-pointer focus:outline-none ${
                    isActive
                      ? 'bg-bg-secondary text-accent-blue font-semibold border-b-2 md:border-b-0 md:border-l-2 border-accent-blue'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
                  }`}
                >
                  {inst.title}
                </button>
              );
            })}
          </nav>

          {/* Active Content Card */}
          <div className="md:col-span-3 border border-border-custom bg-bg-card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
              {activeInstruction.title}
            </h2>
            <p className="text-xs text-text-secondary mb-6 pb-4 border-b border-border-custom">
              {activeInstruction.description}
            </p>
            <div
              className="text-text-primary"
              dangerouslySetInnerHTML={{ __html: activeInstruction.htmlContent }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-bg-card py-6 mt-12 text-center text-xs text-text-secondary">
        <div className="mx-auto max-w-5xl px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>© {new Date().getFullYear()} aControl. Всі права захищені.</div>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Про сервіс</Link>
            <Link href="/kb" className="hover:underline">База знань</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
