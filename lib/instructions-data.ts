export interface Instruction {
  id: string;
  title: string;
  description: string;
  htmlContent: string;
}

export const instructions: Instruction[] = [
  {
    id: 'ga4',
    title: 'Google Analytics 4 (GA4)',
    description: 'Налаштування Measurement Protocol та надання прав адміністратора для автоматичної передачі даних.',
    htmlContent: `
      <div class="space-y-3">
        <p>Для передачі конверсій у GA4 вам необхідно налаштувати Measurement Protocol:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>Перейдіть в адміністративну панель вашого ресурсу GA4.</li>
          <li>У розділі збору даних оберіть <strong>Потоки даних</strong> (Data Streams) та виберіть ваш веб-потік.</li>
          <li>Знайдіть пункт <strong>Measurement Protocol API secrets</strong> та створіть новий секретний ключ.</li>
          <li>Скопіюйте отриманий <strong>API secret</strong> та <strong>Measurement ID</strong> (ідентифікатор потоку, який починається на G-).</li>
          <li>Надайте доступ з правами адміністратора на електронну пошту <strong class="select-all font-mono text-xs text-accent-blue bg-bg-secondary px-1.5 py-0.5 rounded border border-border-custom">auto@acontrol.pro</strong> у налаштуваннях доступу до ресурсу GA4 для автоматичної синхронізації.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'ads',
    title: 'Google Ads',
    description: 'Налаштування дії-конверсії типу «Імпорт» та надання доступу для відстеження кліків.',
    htmlContent: `
      <div class="space-y-3">
        <p>Для синхронізації офлайн-конверсій із кабінетом Google Ads:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>У вашому кабінеті Google Ads перейдіть до розділу <strong>Інструменти та налаштування</strong> (Tools and Settings) &gt; <strong>Конверсії</strong> (Conversions).</li>
          <li>Створіть нову дію-конверсію з типом <strong>Імпорт</strong> (Import) &gt; <strong>Інші джерела / Кліки</strong>.</li>
          <li>Вкажіть назву конверсії точно так само, як вона передається у вашій системі (наприклад, <code>purchase</code> або <code>lead</code>).</li>
          <li>Встановіть відповідне вікно обліку конверсій. Наша платформа автоматично надсилатиме конверсії з унікальним ідентифікатором кліку (GCLID) до вашого акаунту через Google API.</li>
          <li>Надайте доступ з правами адміністратора на електронну пошту <strong class="select-all font-mono text-xs text-accent-blue bg-bg-secondary px-1.5 py-0.5 rounded border border-border-custom">auto@acontrol.pro</strong> у розділі «Доступ та безпека» вашого керуючого або клієнтського акаунту Google Ads.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'gcp',
    title: 'Google Cloud Platform (GCP)',
    description: 'Створення проекту, прив’язка білінгу та делегування необхідних ролей для BigQuery.',
    htmlContent: `
      <div class="space-y-3">
        <p>Для автоматичного завантаження даних та роботи з BigQuery необхідно налаштувати проект Google Cloud:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>Створіть безкоштовний акаунт Google Cloud Platform за посиланням <a href="https://cloud.google.com/free" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline">https://cloud.google.com/free</a>. Рекомендуємо використовувати той самий Google-акаунт, на якому налаштовано ваш ресурс Google Analytics 4.</li>
          <li>Обов'язково виконайте прив'язку платіжного профілю (білінгу) до вашого проекту Google Cloud, оскільки це необхідно для коректної роботи інтеграції.</li>
          <li>У консолі Google Cloud перейдіть у розділ <strong>IAM & Admin</strong> вашого проекту.</li>
          <li>Натисніть кнопку <strong>Grant Access</strong> (Надати доступ).</li>
          <li>У полі «New principals» (Нові учасники) введіть наш Google-акаунт:
            <div class="my-2 bg-bg-secondary border border-border-custom p-3 font-mono text-xs text-text-primary rounded-sm select-all">
              auto@acontrol.pro
            </div>
          </li>
          <li>Призначте для цього акаунту такі три обов’язкові ролі:
            <ul class="list-disc pl-5 mt-2 space-y-1 font-mono text-xs text-text-primary">
              <li>Editor</li>
              <li>Project IAM Admin</li>
              <li>BigQuery Admin</li>
            </ul>
          </li>
          <li>Збережіть зміни. Це дозволить платформі автоматично керувати таблицями конверсій та оновлювати аудиторії.</li>
          <li>Для отримання додаткових відомостей перегляньте відео-інструкцію з базового налаштування за посиланням <a href="https://youtu.be/g4jtifdila0" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline">https://youtu.be/g4jtifdila0</a>, а також відео щодо налаштування прав для організації (Organization Policy Administrator) за посиланням <a href="https://youtu.be/uTIncnrgWvg" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline">https://youtu.be/uTIncnrgWvg</a>.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'binotel',
    title: 'Binotel',
    description: 'Генерація ключів API телефонії та інтеграція для реєстрації дзвінків.',
    htmlContent: `
      <div class="space-y-3">
        <p>Інтеграція з Binotel дозволяє реєструвати вхідні дзвінки як лід-конверсії:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>Увійдіть в особистий кабінет Binotel та перейдіть у налаштування API.</li>
          <li>Згенеруйте нову пару ключів доступу: <strong>API Key</strong> та <strong>API Secret</strong>.</li>
          <li>Скопіюйте посилання на API-сервер Binotel, надане вашим менеджером.</li>
          <li>Ви можете отримати авторизаційні дані через офіційний Telegram-бот <a href="https://t.me/BinotelSiteChatBot?start=pbKuwsiDbuaJ73UhFT" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline">https://t.me/BinotelSiteChatBot?start=pbKuwsiDbuaJ73UhFT</a> або надіславши запит на email <a href="mailto:support@binotel.ua" class="text-accent-blue hover:underline">support@binotel.ua</a> із темою листа «Отримання авторизаційних даних для REST API».</li>
          <li>Перейдіть до вкладки «Інтеграція» у нашому кабінеті та внесіть ці дані у відповідний блок телефонії. Платформа почне обробляти події дзвінків у реальному часі та автоматично записуватиме їх як рекламні конверсії за наявності UTM-міток.</li>
        </ol>
      </div>
    `
  },
  {
    id: 'script',
    title: 'Google Apps Script',
    description: 'Створення скрипту для автоматичного надсилання конверсій з Google Таблиць.',
    htmlContent: `
      <div class="space-y-3">
        <p>Створення та копіювання скрипту в Google Таблицю для автоматичного надсилання конверсій:</p>
        <ol class="list-decimal pl-5 space-y-2">
          <li>Відкрийте Google Таблицю, з якої необхідно надсилати дані про конверсії.</li>
          <li>У верхньому меню оберіть <strong>Розширення</strong> (Extensions) &gt; <strong>Apps Script</strong>.</li>
          <li>Видаліть увесь стандартний код у редакторі.</li>
          <li>Скопіюйте готовий код скрипту з вашого особистого кабінету (вкладка «Інтеграція»), який уже містить ваш унікальний API-ключ для автентифікації.</li>
          <li>Збережіть проект та налаштуйте тригер (наприклад, On Edit або On Form Submit) для автоматичного відправлення нових рядків таблиці до нашої платформи.</li>
        </ol>
      </div>
    `
  }
];
