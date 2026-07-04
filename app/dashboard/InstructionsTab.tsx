'use client';

import { useState } from 'react';

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
        <AccordionItem
          title="Google Analytics 4 (GA4)"
          isOpen={openIndex === 0}
          onToggle={() => toggleIndex(0)}
        >
          <div className="space-y-3">
            <p>Для передачі конверсій у GA4 вам необхідно налаштувати Measurement Protocol:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Перейдіть в адміністративну панель вашого ресурсу GA4.</li>
              <li>У розділі збору даних оберіть <strong>Потоки даних</strong> (Data Streams) та виберіть ваш веб-потік.</li>
              <li>Знайдіть пункт <strong>Measurement Protocol API secrets</strong> та створіть новий секретний ключ.</li>
              <li>Скопіюйте отриманий <strong>API secret</strong> та <strong>Measurement ID</strong> (ідентифікатор потоку, який починається на G-).</li>
              <li>Ці доступи використовуються для прямої передачі конверсій із нашої платформи до GA4.</li>
            </ol>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Google Ads"
          isOpen={openIndex === 1}
          onToggle={() => toggleIndex(1)}
        >
          <div className="space-y-3">
            <p>Для синхронізації офлайн-конверсій із кабінетом Google Ads:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>У вашому кабінеті Google Ads перейдіть до розділу <strong>Інструменти та налаштування</strong> (Tools and Settings) &gt; <strong>Конверсії</strong> (Conversions).</li>
              <li>Створіть нову дію-конверсію з типом <strong>Імпорт</strong> (Import) &gt; <strong>Інші джерела / Кліки</strong>.</li>
              <li>Вкажіть назву конверсії точно так само, як вона передається у вашій системі (наприклад, <code>purchase</code> або <code>lead</code>).</li>
              <li>Встановіть відповідне вікно обліку конверсій. Наша платформа автоматично надсилатиме конверсії з унікальним ідентифікатором кліку (GCLID) до вашого акаунту через Google API.</li>
            </ol>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Google Cloud Platform (GCP)"
          isOpen={openIndex === 2}
          onToggle={() => toggleIndex(2)}
        >
          <div className="space-y-3">
            <p>Для автоматичного завантаження даних та роботи з BigQuery необхідно надати доступ сервісному акаунту платформи:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>У консолі Google Cloud перейдіть у розділ <strong>IAM & Admin</strong> вашого проекту.</li>
              <li>Натисніть кнопку <strong>Grant Access</strong> (Надати доступ).</li>
              <li>У полі &quot;New principals&quot; (Нові учасники) введіть email нашого сервісного акаунту:
                <div className="my-2 bg-bg-secondary border border-border-custom p-3 font-mono text-xs text-text-primary rounded-sm select-all">
                  auto@acontrol.pro
                </div>
              </li>
              <li>Призначте для цього акаунту такі три обов’язкові ролі:
                <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-xs text-text-primary">
                  <li>Editor</li>
                  <li>Project IAM Admin</li>
                  <li>BigQuery Admin</li>
                </ul>
              </li>
              <li>Збережіть зміни. Це дозволить платформі автоматично керувати таблицями конверсій та оновлювати аудиторії.</li>
            </ol>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Binotel (Телефонія)"
          isOpen={openIndex === 3}
          onToggle={() => toggleIndex(3)}
        >
          <div className="space-y-3">
            <p>Інтеграція з Binotel дозволяє реєструвати вхідні дзвінки як лід-конверсії:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Увійдіть в особистий кабінет Binotel та перейдіть у налаштування API.</li>
              <li>Згенеруйте нову пару ключів доступу: <strong>API Key</strong> та <strong>API Secret</strong>.</li>
              <li>Скопіюйте посилання на API-сервер Binotel, надане вашим менеджером.</li>
              <li>Перейдіть до вкладки &quot;Інтеграція&quot; у нашому кабінеті та внесіть ці дані у відповідний блок телефонії.</li>
              <li>Платформа почне обробляти події дзвінків у реальному часі та автоматично записуватиме їх як рекламні конверсії за наявності UTM-міток.</li>
            </ol>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
}
