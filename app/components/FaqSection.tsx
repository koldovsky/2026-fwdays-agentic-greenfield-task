'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqList: FaqItem[] = [
  {
    question: 'Які CRM-системи підтримуються?',
    answer: 'Платформа сумісна з SalesDrive, KeyCRM, Uspacy, NetHunt, а також підтримує інтеграцію з магазинами на Prom та Хорошоп. Налаштування передачі виконується через Google Apps Script.'
  },
  {
    question: 'Як відбувається оплата?',
    answer: 'Оплата здійснюється в UAH за комерційним курсом Monobank на момент списання. Доступні два тарифи: місячний за $10.99 та річний за $120.00.'
  },
  {
    question: 'Чи можна призупинити підписку?',
    answer: 'Так, ви можете поставити підписку на паузу в особистому кабінеті. Сервіс працюватиме до кінця сплаченого періоду, після чого автоматичні списання та передача конверсій призупиняться.'
  },
  {
    question: 'Як забезпечується приватність даних?',
    answer: 'Платформа не використовує жодних сторонніх трекерів чи рекламних файлів cookie. Усі збережені доступи до кабінетів шифруються за допомогою алгоритму AES-256-GCM.'
  },
  {
    question: 'Як зв\'язатися з технічною підтримкою?',
    answer: 'Усі звернення, сповіщення та керування доступом інтегровані через наш офіційний Telegram-бот.'
  }
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-bg-page border-t border-border-custom" id="faq">
      <div className="mx-auto max-w-3xl px-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-text-primary mb-10 tracking-tight">
          Часті запитання
        </h2>

        <div className="space-y-4">
          {faqList.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="border border-border-custom bg-bg-card transition-all duration-200"
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left font-display font-medium text-text-primary hover:bg-bg-secondary transition-colors duration-200 focus:outline-none cursor-pointer"
                >
                  <span className="text-sm md:text-base">{item.question}</span>
                  <span
                    className={`transform transition-transform duration-300 text-text-secondary text-xs ${
                      isOpen ? 'rotate-180 text-accent-blue' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-40 border-t border-border-custom opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="px-6 py-5 text-xs md:text-sm text-text-secondary leading-relaxed font-sans">
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
