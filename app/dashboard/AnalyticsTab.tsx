'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface MetricData {
  totalConversions: number;
  totalValue: number;
  adConversions: number;
  adConversionsPercent: number;
}

interface ChartItem {
  label: string;
  total: number;
  ad: number;
}

interface PieItem {
  name: string;
  value: number;
}

interface ConversionItem {
  id: string;
  date: string;
  conversionTime: string;
  conversionName: string;
  isAdConversion: boolean;
  email: string | null;
  phone: string | null;
  conversionValue: string | null;
  orderId: string | null;
  ipAddress: string | null;
  adSource: string | null;
  channel: string | null;
}

interface AnalyticsResponse {
  metrics: MetricData;
  charts: {
    lineChart: ChartItem[];
    sourcesPie: PieItem[];
    channelsPie: PieItem[];
  };
  conversions: ConversionItem[];
}

const formatDateHelper = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AnalyticsTab() {
  const [isMounted, setIsMounted] = useState(false);

  // Date states
  const [datePreset, setDatePreset] = useState<'30' | '90' | '180' | 'custom'>('30');
  const [startDate, setStartDate] = useState(() => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 29);
    return formatDateHelper(pastDate);
  });
  const [endDate, setEndDate] = useState(() => {
    return formatDateHelper(new Date());
  });

  // Filters state
  const [adSourceFilter, setAdSourceFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  // Query states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Set default dates on mount
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  // Sync preset to date strings
  const handlePresetChange = (preset: '30' | '90' | '180' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'custom') return;

    const today = new Date();
    const daysCount = parseInt(preset);
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - (daysCount - 1));

    setStartDate(formatDateHelper(pastDate));
    setEndDate(formatDateHelper(today));
  };

  // Fetch data
  useEffect(() => {
    if (!startDate || !endDate) return;

    let ignore = false;

    async function fetchAnalytics() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const queryParams = new URLSearchParams({
          startDate,
          endDate,
          adSource: adSourceFilter,
          channel: channelFilter,
        });
        const res = await fetch(`/api/analytics?${queryParams.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (res.ok) {
          setAnalyticsData(data);
          setCurrentPage(1); // Reset pagination on filter load
        } else {
          setErrorMsg(data.error || 'Помилка завантаження аналітичних даних');
        }
      } catch {
        if (ignore) return;
        setErrorMsg('Не вдалося завантажити аналітичні дані з сервера');
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      ignore = true;
    };
  }, [startDate, endDate, adSourceFilter, channelFilter]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Format date helper
  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Pagination slice
  const paginatedConversions = analyticsData
    ? analyticsData.conversions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  const totalPages = analyticsData
    ? Math.max(1, Math.ceil(analyticsData.conversions.length / itemsPerPage))
    : 1;

  // Chart styling constants
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#9ca3af'];

  const lineChartData = analyticsData?.charts?.lineChart || [];
  const sourcesPieData = analyticsData?.charts?.sourcesPie?.filter(p => p.value > 0) || [];
  const channelsPieData = analyticsData?.charts?.channelsPie?.filter(p => p.value > 0) || [];

  return (
    <div className="space-y-8">
      {/* ERROR MESSAGE DISPLAY */}
      {errorMsg && (
        <div className="border border-status-danger bg-status-danger/5 p-4 text-sm text-status-danger">
          {errorMsg}
        </div>
      )}

      {/* FILTER & PERIOD SELECTOR PANEL */}
      <div className="border border-border-custom bg-bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {(['30', '90', '180'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                  datePreset === preset
                    ? 'bg-bg-secondary border-border-active text-text-primary font-semibold'
                    : 'bg-bg-card border-border-custom text-text-secondary hover:border-border-active'
                }`}
              >
                Останні {preset} днів
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                datePreset === 'custom'
                  ? 'bg-bg-secondary border-border-active text-text-primary font-semibold'
                  : 'bg-bg-card border-border-custom text-text-secondary hover:border-border-active'
              }`}
            >
              Власний період
            </button>
          </div>

          {/* Source and Channel Select Inputs */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Джерело</label>
              <select
                value={adSourceFilter}
                onChange={(e) => setAdSourceFilter(e.target.value)}
                className="text-xs p-1.5 bg-bg-card border border-border-custom text-text-primary focus:outline-none"
              >
                <option value="all">Усі джерела</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Organic">Organic</option>
                <option value="інше">інше</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Канал</label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-xs p-1.5 bg-bg-card border border-border-custom text-text-primary focus:outline-none"
              >
                <option value="all">Усі канали</option>
                <option value="Вебсайт">Вебсайт</option>
                <option value="Телефонія">Телефонія</option>
                <option value="Месенджери">Месенджери</option>
                <option value="інше">інше</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date boundary text inputs (custom mode) */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-custom flex-wrap">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Початкова дата</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs p-1.5 bg-bg-card border border-border-custom text-text-primary focus:outline-none"
              />
            </div>
            <div className="text-text-secondary text-xs mt-4">до</div>
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Кінцева дата</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs p-1.5 bg-bg-card border border-border-custom text-text-primary focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Card 1: Total Conversions */}
        <div className="border border-border-custom bg-bg-card p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Усього конверсій
          </span>
          {isLoading ? (
            <div className="h-8 bg-bg-secondary animate-pulse mt-2 w-2/3"></div>
          ) : (
            <span className="font-display text-2xl font-semibold text-text-primary block mt-1">
              {analyticsData?.metrics.totalConversions ?? 0}
            </span>
          )}
        </div>

        {/* Card 2: Total Value */}
        <div className="border border-border-custom bg-bg-card p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Загальна цінність
          </span>
          {isLoading ? (
            <div className="h-8 bg-bg-secondary animate-pulse mt-2 w-3/4"></div>
          ) : (
            <span className="font-display text-2xl font-semibold text-text-primary block mt-1">
              {formatCurrency(analyticsData?.metrics.totalValue ?? 0)}
            </span>
          )}
        </div>

        {/* Card 3: Ad Conversions */}
        <div className="border border-border-custom bg-bg-card p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Рекламні конверсії
          </span>
          {isLoading ? (
            <div className="h-8 bg-bg-secondary animate-pulse mt-2 w-1/2"></div>
          ) : (
            <span className="font-display text-2xl font-semibold text-text-primary block mt-1">
              {analyticsData?.metrics.adConversions ?? 0}
            </span>
          )}
        </div>

        {/* Card 4: Ad Conversions % */}
        <div className="border border-border-custom bg-bg-card p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Частка рекламних
          </span>
          {isLoading ? (
            <div className="h-8 bg-bg-secondary animate-pulse mt-2 w-1/2"></div>
          ) : (
            <span className="font-display text-2xl font-semibold text-text-primary block mt-1">
              {analyticsData?.metrics.adConversionsPercent ?? 0} %
            </span>
          )}
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* LINE CHART CONTAINER */}
        <div className="border border-border-custom bg-bg-card p-6 flex flex-col h-[380px]">
          <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
            Динаміка конверсій
          </h4>
          {!isMounted || isLoading ? (
            <div className="flex-1 bg-bg-secondary/50 animate-pulse border border-border-custom flex items-center justify-center text-xs text-text-muted">
              Завантаження графіка...
            </div>
          ) : lineChartData.length === 0 ? (
            <div className="flex-1 border border-border-custom border-dashed flex items-center justify-center text-xs text-text-muted">
              Немає даних про конверсії за цей період
            </div>
          ) : (
            <div className="flex-1 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#9ca3af" tickLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="square" />
                  <Line
                    type="monotone"
                    name="Загальні"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    name="Рекламні"
                    dataKey="ad"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PIE CHARTS CONTAINER */}
        <div className="border border-border-custom bg-bg-card p-6 flex flex-col h-[380px]">
          <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
            Розподіл за категоріями
          </h4>

          {!isMounted || isLoading ? (
            <div className="flex-1 bg-bg-secondary/50 animate-pulse border border-border-custom flex items-center justify-center text-xs text-text-muted">
              Завантаження діаграм...
            </div>
          ) : (sourcesPieData.length === 0 && channelsPieData.length === 0) ? (
            <div className="flex-1 border border-border-custom border-dashed flex items-center justify-center text-xs text-text-muted">
              Дані відсутні
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Pie 1: Sources */}
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-[10px] font-semibold text-text-secondary mb-2 block">
                  Рекламні джерела
                </span>
                {sourcesPieData.length === 0 ? (
                  <div className="h-32 w-32 rounded-full border border-border-custom border-dashed flex items-center justify-center text-[10px] text-text-muted">
                    Немає даних
                  </div>
                ) : (
                  <div className="relative w-full h-44 text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourcesPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {sourcesPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} layout="horizontal" align="center" verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Pie 2: Channels */}
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-[10px] font-semibold text-text-secondary mb-2 block">
                  Канали зв’язку
                </span>
                {channelsPieData.length === 0 ? (
                  <div className="h-32 w-32 rounded-full border border-border-custom border-dashed flex items-center justify-center text-[10px] text-text-muted">
                    Немає даних
                  </div>
                ) : (
                  <div className="relative w-full h-44 text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelsPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {channelsPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} layout="horizontal" align="center" verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE: CONVERSIONS LOG TABLE */}
      <div className="border border-border-custom bg-bg-card p-6">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
          Лог останніх 100 конверсій
        </h4>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 bg-bg-secondary w-full"></div>
            <div className="h-8 bg-bg-secondary w-full"></div>
            <div className="h-8 bg-bg-secondary w-full"></div>
          </div>
        ) : !analyticsData || analyticsData.conversions.length === 0 ? (
          <div className="border border-border-custom border-dashed p-8 text-center text-xs text-text-muted">
            Конверсій не знайдено за обраний період
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-text-secondary uppercase text-[10px] tracking-wider bg-bg-secondary/40">
                    <th className="py-3 px-4 font-semibold">Час</th>
                    <th className="py-3 px-4 font-semibold">Назва</th>
                    <th className="py-3 px-4 font-semibold">Рекламна</th>
                    <th className="py-3 px-4 font-semibold">Джерело</th>
                    <th className="py-3 px-4 font-semibold">Канал</th>
                    <th className="py-3 px-4 font-semibold text-right">Цінність</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-text-primary">
                  {paginatedConversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-text-muted">
                        {formatDateTime(conv.conversionTime)}
                      </td>
                      <td className="py-3 px-4 font-medium text-text-primary">
                        {conv.conversionName}
                      </td>
                      <td className="py-3 px-4">
                        {conv.isAdConversion ? (
                          <span className="text-status-success bg-status-success/5 border border-status-success/20 px-1.5 py-0.5 rounded-sm text-[10px]">
                            Так
                          </span>
                        ) : (
                          <span className="text-text-muted border border-border-custom px-1.5 py-0.5 rounded-sm text-[10px]">
                            Ні
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{conv.adSource || '-'}</td>
                      <td className="py-3 px-4 text-text-secondary">{conv.channel || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-text-primary">
                        {conv.conversionValue ? formatCurrency(parseFloat(conv.conversionValue)) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {analyticsData.conversions.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-4 border-t border-border-custom">
                <span className="text-[11px] text-text-secondary">
                  Показано {Math.min(analyticsData.conversions.length, (currentPage - 1) * itemsPerPage + 1)}–
                  {Math.min(analyticsData.conversions.length, currentPage * itemsPerPage)} із{' '}
                  {analyticsData.conversions.length} записів
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="border border-border-custom px-3 py-1 text-[11px] text-text-secondary font-medium hover:border-border-active transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Назад
                  </button>
                  <span className="text-[11px] text-text-secondary">
                    Стор. {currentPage} з {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="border border-border-custom px-3 py-1 text-[11px] text-text-secondary font-medium hover:border-border-active transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
