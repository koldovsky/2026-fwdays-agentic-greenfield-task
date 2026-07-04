'use client';

import { useState, useEffect } from 'react';

interface IntegrationTabProps {
  initialApiKeyHash: string;
}

export default function IntegrationTab({ initialApiKeyHash }: IntegrationTabProps) {
  // Credentials state
  const [crmUrl, setCrmUrl] = useState('');
  const [crmLogin, setCrmLogin] = useState('');
  const [crmPassword, setCrmPassword] = useState('');
  const [hasCrmPassword, setHasCrmPassword] = useState(false);

  const [telephonyUrl, setTelephonyUrl] = useState('');
  const [telephonyLogin, setTelephonyLogin] = useState('');
  const [telephonyPassword, setTelephonyPassword] = useState('');
  const [telephonyApiKey, setTelephonyApiKey] = useState('');
  const [hasTelephonyPassword, setHasTelephonyPassword] = useState(false);
  const [hasTelephonyApiKey, setHasTelephonyApiKey] = useState(false);

  const [isCredsLoading, setIsCredsLoading] = useState(true);
  const [isCredsSaving, setIsCredsSaving] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [credsSuccess, setCredsSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // API Key state
  const [apiKeyHash, setApiKeyHash] = useState(initialApiKeyHash);
  const [rawApiKey, setRawApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Copy success indicator
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://acontrol.pro';

  // Load current integration credentials
  useEffect(() => {
    async function loadCreds() {
      try {
        const res = await fetch('/api/dashboard/credentials');
        if (res.ok) {
          const data = await res.json();
          setCrmUrl(data.crmUrl || '');
          setCrmLogin(data.crmLogin || '');
          setHasCrmPassword(data.hasCrmPassword || false);
          if (data.hasCrmPassword) {
            setCrmPassword('••••••••');
          }

          setTelephonyUrl(data.telephonyUrl || '');
          setTelephonyLogin(data.telephonyLogin || '');
          setHasTelephonyPassword(data.hasTelephonyPassword || false);
          setHasTelephonyApiKey(data.hasTelephonyApiKey || false);
          if (data.hasTelephonyPassword) {
            setTelephonyPassword('••••••••');
          }
          if (data.hasTelephonyApiKey) {
            setTelephonyApiKey('••••••••');
          }
        }
      } catch (err) {
        console.error('Не вдалося завантажити доступи:', err);
      } finally {
        setIsCredsLoading(false);
      }
    }
    loadCreds();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCredsSaving(true);
    setCredsError(null);
    setCredsSuccess(null);
    setFieldErrors({});

    // Client-side validations
    const errors: Record<string, string> = {};
    const validateUrl = (url: string, fieldName: string) => {
      if (!url) return;
      if (!url.startsWith('https://')) {
        errors[fieldName] = 'Посилання обов’язково повинно використовувати протокол https://';
        return;
      }
      try {
        new URL(url);
      } catch {
        errors[fieldName] = 'Некоректний формат посилання';
      }
    };

    validateUrl(crmUrl, 'crmUrl');
    validateUrl(telephonyUrl, 'telephonyUrl');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsCredsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/dashboard/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crmUrl,
          crmLogin,
          crmPassword,
          telephonyUrl,
          telephonyLogin,
          telephonyPassword,
          telephonyApiKey,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCredsSuccess('Налаштування інтеграцій успішно збережено');
        if (crmPassword && crmPassword !== '••••••••') setHasCrmPassword(true);
        if (telephonyPassword && telephonyPassword !== '••••••••') setHasTelephonyPassword(true);
        if (telephonyApiKey && telephonyApiKey !== '••••••••') setHasTelephonyApiKey(true);
      } else {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setCredsError(data.error || 'Помилка при збереженні налаштувань');
        }
      }
    } catch {
      setCredsError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsCredsSaving(false);
    }
  };

  const handleClearCredentials = async (type: 'crm' | 'telephony') => {
    if (!confirm('Ви дійсно бажаєте видалити ці доступи?')) return;

    setIsCredsSaving(true);
    setCredsError(null);
    setCredsSuccess(null);

    const payload = type === 'crm' 
      ? { crmUrl: '', crmLogin: '', crmPassword: '', telephonyUrl, telephonyLogin, telephonyPassword, telephonyApiKey }
      : { crmUrl, crmLogin, crmPassword, telephonyUrl: '', telephonyLogin: '', telephonyPassword: '', telephonyApiKey: '' };

    try {
      const res = await fetch('/api/dashboard/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCredsSuccess('Доступи успішно видалено');
        if (type === 'crm') {
          setCrmUrl('');
          setCrmLogin('');
          setCrmPassword('');
          setHasCrmPassword(false);
        } else {
          setTelephonyUrl('');
          setTelephonyLogin('');
          setTelephonyPassword('');
          setTelephonyApiKey('');
          setHasTelephonyPassword(false);
          setHasTelephonyApiKey(false);
        }
      } else {
        const data = await res.json();
        setCredsError(data.error || 'Помилка видалення доступів');
      }
    } catch {
      setCredsError('Не вдалося виконати запит');
    } finally {
      setIsCredsSaving(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (apiKeyHash && !confirm('Створення нового ключа анулює ваш попередній API-ключ. Продовжити?')) {
      return;
    }

    setIsGeneratingKey(true);
    setKeyError(null);
    setRawApiKey(null);

    try {
      const res = await fetch('/api/dashboard/api-key', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.apiKey) {
        setRawApiKey(data.apiKey);
        // Calculate placeholder SHA256 locally or just show generated state
        setApiKeyHash('оновлено');
      } else {
        setKeyError(data.error || 'Не вдалося згенерувати API-ключ');
      }
    } catch {
      setKeyError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasKey = apiKeyHash && apiKeyHash !== '';

  // Apps Script Code Template
  const appsScriptCode = `function sendConversions() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Лише заголовок або порожня таблиця
  
  var conversions = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var conversion = {
      date: formatDate(row[0]), // Формат YYYY-MM-DD
      conversionTime: formatISO(row[1]), // ISO 8601
      conversionName: String(row[2]),
      isAdConversion: Boolean(row[3]),
      email: row[4] ? String(row[4]) : null,
      phone: row[5] ? String(row[5]) : null,
      conversionValue: row[6] ? Number(row[6]) : null,
      orderId: row[7] ? String(row[7]) : null,
      ipAddress: row[8] ? String(row[8]) : null,
      adSource: row[9] ? String(row[9]) : null,
      channel: row[10] ? String(row[10]) : null
    };
    conversions.push(conversion);
  }
  
  var url = "${hostUrl}/api/conversions";
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": "${rawApiKey || 'YOUR_API_KEY'}"
    },
    payload: JSON.stringify({ conversions: conversions }),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal);
}

function formatISO(dateVal) {
  if (dateVal instanceof Date) {
    return dateVal.toISOString();
  }
  return String(dateVal);
}`;

  return (
    <div className="space-y-8">
      {/* 1. API KEY GENERATOR */}
      <div className="border border-border-custom bg-bg-card p-6">
        <h3 className="font-display text-lg font-medium text-text-primary mb-2">
          Інтеграція по API (Google Таблиці)
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          Для налаштування автоматичної передачі конверсій з Google Таблиць вам знадобиться API-ключ та скрипт Google Apps Script.
        </p>

        {keyError && (
          <div className="mb-4 border border-status-danger bg-status-danger/5 p-3 text-xs text-status-danger">
            {keyError}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-custom pb-4">
            <div>
              <span className="text-xs text-text-muted block">Статус API-ключа:</span>
              <span className="text-sm font-medium text-text-primary">
                {hasKey ? 'Ключ згенеровано' : 'Ключ ще не створено'}
              </span>
            </div>
            <button
              onClick={handleGenerateApiKey}
              disabled={isGeneratingKey}
              className="bg-accent-blue hover:bg-accent-blue/90 text-white font-medium px-4 py-2 text-xs transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingKey ? 'Генерація...' : hasKey ? 'Згенерувати новий ключ' : 'Створити API-ключ'}
            </button>
          </div>

          {rawApiKey && (
            <div className="border border-status-warning bg-status-warning/5 p-4 space-y-2">
              <span className="text-xs font-semibold text-status-warning block">
                Скопіюйте ваш новий API-ключ зараз. Він буде показаний лише ОДИН РАЗ:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-primary break-all bg-bg-card border border-border-custom p-2 block flex-1">
                  {rawApiKey}
                </span>
                <button
                  onClick={() => copyToClipboard(rawApiKey, setCopiedKey)}
                  className="border border-border-custom bg-bg-card hover:bg-bg-secondary px-3 py-2 text-xs font-medium text-text-primary transition-colors cursor-pointer"
                >
                  {copiedKey ? 'Скопійовано' : 'Копіювати'}
                </button>
              </div>
            </div>
          )}

          {hasKey ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Код Google Apps Script
                </span>
                <button
                  onClick={() => copyToClipboard(appsScriptCode, setCopiedScript)}
                  className="text-accent-blue hover:underline text-xs font-medium cursor-pointer"
                >
                  {copiedScript ? 'Код скопійовано' : 'Копіювати весь код'}
                </button>
              </div>
              
              {!rawApiKey && (
                <div className="text-[11px] text-text-muted bg-bg-secondary p-2.5 border border-border-custom">
                  Примітка: з міркувань безпеки ми не зберігаємо ваш відкритий API-ключ. 
                  У шаблоні нижче використовується заглушка <code>YOUR_API_KEY</code>. 
                  Вставте ваш збережений ключ у код після копіювання.
                </div>
              )}

              <textarea
                readOnly
                value={appsScriptCode}
                className="w-full h-64 font-mono text-[11px] p-4 bg-bg-secondary border border-border-custom text-text-primary leading-normal focus:outline-none focus:ring-0 resize-y"
              />
            </div>
          ) : (
            <div className="text-xs text-text-muted italic text-center py-4">
              Згенеруйте API-ключ, щоб отримати готовий код інтеграції для Google Таблиць.
            </div>
          )}
        </div>
      </div>

      {/* 2. CREDENTIALS SETTINGS */}
      <div className="border border-border-custom bg-bg-card p-6">
        <h3 className="font-display text-lg font-medium text-text-primary mb-2">
          Налаштування CRM та Телефонії
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          Внесіть ваші доступи до CRM та Телефонії. Чутливі дані будуть зашифровані надійним алгоритмом AES-256-GCM.
        </p>

        {isCredsLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-bg-secondary border border-border-custom"></div>
            <div className="h-10 bg-bg-secondary border border-border-custom"></div>
          </div>
        ) : (
          <form onSubmit={handleSaveCredentials} className="space-y-6">
            {credsError && (
              <div className="border border-status-danger bg-status-danger/5 p-3 text-xs text-status-danger">
                {credsError}
              </div>
            )}
            {credsSuccess && (
              <div className="border border-status-success bg-status-success/5 p-3 text-xs text-status-success">
                {credsSuccess}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* CRM Access block */}
              <div className="space-y-4 border border-border-custom p-4 bg-bg-secondary/40">
                <div className="flex justify-between items-center border-b border-border-custom pb-2">
                  <h4 className="font-display text-sm font-medium text-text-primary">
                    CRM система
                  </h4>
                  {crmUrl && (
                    <button
                      type="button"
                      onClick={() => handleClearCredentials('crm')}
                      className="text-status-danger hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Видалити доступи
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      URL-адреса CRM (потрібен HTTPS)
                    </label>
                    <input
                      type="text"
                      placeholder="https://my-crm.com"
                      value={crmUrl}
                      onChange={(e) => setCrmUrl(e.target.value)}
                      className={`w-full text-xs p-2 bg-bg-card border text-text-primary focus:outline-none ${
                        fieldErrors.crmUrl ? 'border-status-danger' : 'border-border-custom focus:border-border-active'
                      }`}
                    />
                    {fieldErrors.crmUrl && (
                      <span className="text-[10px] text-status-danger mt-1 block">
                        {fieldErrors.crmUrl}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      Логін / Користувач
                    </label>
                    <input
                      type="text"
                      placeholder="crm_admin"
                      value={crmLogin}
                      onChange={(e) => setCrmLogin(e.target.value)}
                      className="w-full text-xs p-2 bg-bg-card border border-border-custom text-text-primary focus:outline-none focus:border-border-active"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      Пароль доступу
                    </label>
                    <input
                      type="password"
                      placeholder={hasCrmPassword ? '••••••••' : 'crm_password'}
                      value={crmPassword}
                      onChange={(e) => setCrmPassword(e.target.value)}
                      className="w-full text-xs p-2 bg-bg-card border border-border-custom text-text-primary focus:outline-none focus:border-border-active"
                    />
                  </div>
                </div>
              </div>

              {/* Telephony Access block */}
              <div className="space-y-4 border border-border-custom p-4 bg-bg-secondary/40">
                <div className="flex justify-between items-center border-b border-border-custom pb-2">
                  <h4 className="font-display text-sm font-medium text-text-primary">
                    Телефонія (API)
                  </h4>
                  {telephonyUrl && (
                    <button
                      type="button"
                      onClick={() => handleClearCredentials('telephony')}
                      className="text-status-danger hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Видалити доступи
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      URL сервісу телефонії (потрібен HTTPS)
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.binotel.ua"
                      value={telephonyUrl}
                      onChange={(e) => setTelephonyUrl(e.target.value)}
                      className={`w-full text-xs p-2 bg-bg-card border text-text-primary focus:outline-none ${
                        fieldErrors.telephonyUrl ? 'border-status-danger' : 'border-border-custom focus:border-border-active'
                      }`}
                    />
                    {fieldErrors.telephonyUrl && (
                      <span className="text-[10px] text-status-danger mt-1 block">
                        {fieldErrors.telephonyUrl}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      Логін / Клієнт ID
                    </label>
                    <input
                      type="text"
                      placeholder="telephony_user"
                      value={telephonyLogin}
                      onChange={(e) => setTelephonyLogin(e.target.value)}
                      className="w-full text-xs p-2 bg-bg-card border border-border-custom text-text-primary focus:outline-none focus:border-border-active"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      Пароль телефонії
                    </label>
                    <input
                      type="password"
                      placeholder={hasTelephonyPassword ? '••••••••' : 'telephony_password'}
                      value={telephonyPassword}
                      onChange={(e) => setTelephonyPassword(e.target.value)}
                      className="w-full text-xs p-2 bg-bg-card border border-border-custom text-text-primary focus:outline-none focus:border-border-active"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      REST API Ключ (Token)
                    </label>
                    <input
                      type="password"
                      placeholder={hasTelephonyApiKey ? '••••••••' : 'telephony_api_key'}
                      value={telephonyApiKey}
                      onChange={(e) => setTelephonyApiKey(e.target.value)}
                      className="w-full text-xs p-2 bg-bg-card border border-border-custom text-text-primary focus:outline-none focus:border-border-active"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isCredsSaving}
                className="bg-accent-blue hover:bg-accent-blue/90 text-white font-medium px-6 py-2.5 text-xs transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                {isCredsSaving ? 'Збереження...' : 'Зберегти зміни'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
