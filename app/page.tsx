import Link from 'next/link';
import FaqSection from '@/app/components/FaqSection';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-page font-sans text-text-primary">
      {/* Top Header */}
      <header className="border-b border-border-custom bg-bg-card sticky top-0 z-50 px-8 py-4 backdrop-blur-md bg-opacity-95">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-display text-xl font-medium tracking-tight text-text-primary hover:text-accent-blue transition-colors duration-200">
            aControl
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/kb"
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              База знань
            </Link>
            <Link
              href="#pricing"
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Тарифи
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Увійти
            </Link>
            <Link
              href="/register"
              className="border border-accent-blue bg-accent-blue text-white px-3.5 py-1.5 font-sans text-xs font-medium hover:bg-opacity-95 transition-colors duration-200 cursor-pointer rounded-sm"
            >
              Почати роботу
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 text-center bg-bg-card border-b border-border-custom">
        <div className="mx-auto max-w-3xl px-8">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary mb-6 leading-tight">
            Синхронізація офлайн-конверсій для вашого бізнесу
          </h1>
          <p className="text-base md:text-lg text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Передавайте дані про продажі, дзвінки та ліди безпосередньо до Google Analytics 4 та Google Ads без використання кук відстеження та сторонніх трекерів.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 font-sans text-sm font-semibold text-white bg-accent-blue border border-accent-blue hover:bg-opacity-90 transition-all rounded-sm shadow-sm cursor-pointer"
            >
              Почати роботу
            </Link>
            <Link
              href="/kb"
              className="px-6 py-3 font-sans text-sm font-semibold text-text-secondary bg-bg-secondary border border-border-custom hover:bg-bg-page hover:text-text-primary transition-all rounded-sm cursor-pointer"
            >
              База знань
            </Link>
          </div>
        </div>
      </section>

      {/* Key Benefits Grid */}
      <section className="py-20 bg-bg-page border-b border-border-custom">
        <div className="mx-auto max-w-5xl px-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-text-primary mb-12 tracking-tight">
            Чому обирають aControl
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-border-custom bg-bg-card p-6 rounded-sm">
              <div className="w-10 h-10 flex items-center justify-center bg-bg-secondary text-accent-blue rounded-sm mb-4">
                🔒
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Повна приватність
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Сервіс не використовує аналітичні трекери чи рекламні файли cookie. Всі доступи шифруються через AES-256-GCM.
              </p>
            </div>

            <div className="border border-border-custom bg-bg-card p-6 rounded-sm">
              <div className="w-10 h-10 flex items-center justify-center bg-bg-secondary text-accent-blue rounded-sm mb-4">
                ⚙️
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Пряме з’єднання
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Ми взаємодіємо безпосередньо з офіційними API сервісів без додаткових посередників чи ризиків затримок.
              </p>
            </div>

            <div className="border border-border-custom bg-bg-card p-6 rounded-sm">
              <div className="w-10 h-10 flex items-center justify-center bg-bg-secondary text-accent-blue rounded-sm mb-4">
                📋
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Гнучка інтеграція
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Інтегруйтеся з SalesDrive, KeyCRM, Uspacy чи NetHunt за допомогою нашого універсального коду Google Apps Script.
              </p>
            </div>

            <div className="border border-border-custom bg-bg-card p-6 rounded-sm">
              <div className="w-10 h-10 flex items-center justify-center bg-bg-secondary text-accent-blue rounded-sm mb-4">
                ⏳
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Контроль лімітів
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Очищення застарілих даних відбувається кожні 14 місяців. Ми стежимо за безпекою та ізоляцією збережених записів.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-bg-card border-b border-border-custom">
        <div className="mx-auto max-w-4xl px-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-text-primary mb-16 tracking-tight">
            Схема роботи платформи
          </h2>

          <div className="relative border-l border-border-custom ml-4 md:ml-32 space-y-12">
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-accent-blue border-4 border-bg-card flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Підключіть джерела конверсій
              </h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
                Налаштуйте відправку даних зі своєї CRM, телефонії Binotel чи Google Таблиці за допомогою покрокових інструкцій у базі знань.
              </p>
            </div>

            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-accent-blue border-4 border-bg-card flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Налаштуйте прийом даних
              </h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
                Введіть Measurement ID для ресурсу GA4 або створіть дію-конверсію типу Імпорт у вашому кабінеті Google Ads.
              </p>
            </div>

            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-accent-blue border-4 border-bg-card flex items-center justify-center text-white text-xs font-bold">
                3
              </div>
              <h3 className="font-display font-semibold text-base text-text-primary mb-2">
                Отримуйте точну аналітику
              </h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
                Платформа автоматично оброблятиме події та надсилатиме конверсії до маркетингових кабінетів для оптимізації рекламних кампаній.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-20 bg-bg-page border-b border-border-custom" id="pricing">
        <div className="mx-auto max-w-4xl px-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-text-primary mb-4 tracking-tight">
            Прості та прозорі тарифи
          </h2>
          <p className="text-center text-xs md:text-sm text-text-secondary mb-12 max-w-md mx-auto">
            Оберіть оптимальний період підписки для вашого бізнесу без прихованих платежів чи додаткових комісій.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Monthly Plan */}
            <div className="border border-border-custom bg-bg-card p-8 flex flex-col justify-between rounded-sm">
              <div>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                  Місячний тариф
                </h3>
                <p className="text-xs text-text-secondary mb-6">
                  Для невеликих проектів або тестування можливостей.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-text-primary font-display">$10.99</span>
                  <span className="text-xs text-text-secondary">/ місяць</span>
                </div>
                <ul className="space-y-3 mb-8 text-xs text-text-secondary">
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Підключення GA4 та Google Ads
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Інтеграція CRM та телефонії
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Telegram-бот для керування
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Можливість паузи підписки
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full text-center px-4 py-2 text-xs font-semibold text-text-secondary bg-bg-secondary border border-border-custom hover:bg-bg-page hover:text-text-primary transition-all rounded-sm"
              >
                Оформити
              </Link>
            </div>

            {/* Annual Plan */}
            <div className="border-2 border-accent-blue bg-bg-card p-8 flex flex-col justify-between rounded-sm relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-accent-blue text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full uppercase">
                Вигідно
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                  Річний тариф
                </h3>
                <p className="text-xs text-text-secondary mb-6">
                  Для довгострокового використання та максимальної економії.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-text-primary font-display">$120.00</span>
                  <span className="text-xs text-text-secondary">/ рік</span>
                </div>
                <ul className="space-y-3 mb-8 text-xs text-text-secondary">
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Заощадження понад 9%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Підключення GA4 та Google Ads
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Інтеграція CRM та телефонії
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-status-success">✓</span> Telegram-бот та сповіщення
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full text-center px-4 py-2 text-xs font-semibold text-white bg-accent-blue hover:bg-opacity-90 transition-all rounded-sm"
              >
                Оформити
              </Link>
            </div>
          </div>

          <p className="text-[10px] text-center text-text-muted mt-8">
            Оплата здійснюється в UAH за комерційним курсом Monobank на момент списання коштів.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection />

      {/* Footer */}
      <footer className="border-t border-border-custom bg-bg-card py-10 text-center text-xs text-text-secondary">
        <div className="mx-auto max-w-5xl px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-display text-base font-bold text-text-primary">aControl</span>
            <span>Платформа автоматичної синхронізації конверсій.</span>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <Link href="/kb" className="hover:underline">База знань</Link>
            <Link href="/kb?tab=gcp" className="hover:underline">Налаштування GCP</Link>
            <Link href="/kb?tab=binotel" className="hover:underline">Інтеграція Binotel</Link>
          </div>
          <div>
            © {new Date().getFullYear()} aControl. Всі права захищені.
          </div>
        </div>
      </footer>
    </div>
  );
}
