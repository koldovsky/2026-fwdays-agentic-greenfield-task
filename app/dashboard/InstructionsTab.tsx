'use client';

import { useState } from 'react';
import { instructions } from '@/lib/instructions-data';

interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionItem({ title, isOpen, onToggle, children }: AccordionItemProps) {
  return (
    <div className="border border-border-custom bg-bg-card transition-all duration-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left font-display font-medium text-text-primary hover:bg-bg-secondary transition-colors duration-200 focus:outline-none"
      >
        <span>{title}</span>
        <span className={`transform transition-transform duration-200 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border-custom px-6 py-5 text-sm text-text-secondary leading-relaxed bg-bg-card font-sans">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InstructionsTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-medium text-text-primary mb-2">
          Інструкції з налаштування інтеграцій
        </h3>
        <p className="text-xs text-text-secondary">
          Дотримуйтесь цих покрокових інструкцій, щоб підключити аналітичні сервіси та автоматизувати передачу конверсій.
        </p>
      </div>

      <div className="space-y-4">
        {instructions.map((item, index) => (
          <AccordionItem
            key={item.id}
            title={item.title}
            isOpen={openIndex === index}
            onToggle={() => toggleIndex(index)}
          >
            <div dangerouslySetInnerHTML={{ __html: item.htmlContent }} />
          </AccordionItem>
        ))}
      </div>
    </div>
  );
}
