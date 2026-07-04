import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { conversions } from '@/db/schema';
import { and, or, eq, gte, lte, desc, ilike, not, SQL } from 'drizzle-orm';

// Timezone offset / Parsing utilities
function getKyivParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: parseInt(getPart('year')),
    month: parseInt(getPart('month')),
    day: parseInt(getPart('day')),
    hour: parseInt(getPart('hour')),
    minute: parseInt(getPart('minute')),
    second: parseInt(getPart('second')),
  };
}

function getKyivDateString(date: Date): string {
  const { year, month, day } = getKyivParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseInTimeZone(dateStr: string, timeStr: string, timeZone = 'Europe/Kyiv') {
  const tempDate = new Date(`${dateStr}T${timeStr}`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(tempDate);
  const getPart = (type: string) => parts.find((p) => p.type === type)!.value;
  const year = parseInt(getPart('year'));
  const month = parseInt(getPart('month'));
  const day = parseInt(getPart('day'));
  const hour = parseInt(getPart('hour'));
  const minute = parseInt(getPart('minute'));
  const second = parseInt(getPart('second'));

  const formattedUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const diff = tempDate.getTime() - formattedUtc;
  return new Date(tempDate.getTime() + diff);
}

function getKyivWeekStartString(date: Date): string {
  const parts = getKyivParts(date);
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));

  const wYear = weekStart.getUTCFullYear();
  const wMonth = weekStart.getUTCMonth() + 1;
  const wDay = weekStart.getUTCDate();

  return `Тиждень з ${String(wDay).padStart(2, '0')}.${String(wMonth).padStart(2, '0')}.${wYear}`;
}

function getKyivMonthString(date: Date): string {
  const { year, month } = getKyivParts(date);
  const monthNamesUa = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];
  return `${monthNamesUa[month - 1]} ${year}`;
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let startDate = searchParams.get('startDate') || '';
    let endDate = searchParams.get('endDate') || '';
    const adSource = searchParams.get('adSource') || 'all';
    const channel = searchParams.get('channel') || 'all';

    const now = new Date();
    const todayKyivStr = getKyivDateString(now);

    // Default dates (last 30 days)
    if (!startDate || !endDate) {
      endDate = todayKyivStr;
      const startOffsetDate = new Date();
      const parts = getKyivParts(startOffsetDate);
      const defaultStartOffset = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - 29));
      startDate = getKyivDateString(defaultStartOffset);
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Некоректний формат дати. Очікується YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // Validate logical boundaries
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Кінцева дата не може бути ранішою за початкову дату.' },
        { status: 400 }
      );
    }

    if (startDate > todayKyivStr || endDate > todayKyivStr) {
      return NextResponse.json(
        { error: 'Дати не можуть бути в майбутньому.' },
        { status: 400 }
      );
    }

    // Validate 14 months limit
    const partsNow = getKyivParts(now);
    const fourteenMonthsAgo = new Date(Date.UTC(partsNow.year, partsNow.month - 1 - 14, partsNow.day));
    const fourteenMonthsAgoStr = getKyivDateString(fourteenMonthsAgo);
    if (startDate < fourteenMonthsAgoStr) {
      return NextResponse.json(
        { error: 'Початкова дата не може бути ранішою за 14 місяців від сьогодні.' },
        { status: 400 }
      );
    }

    // Parse boundary timestamps in Europe/Kyiv time
    const startUtc = parseInTimeZone(startDate, '00:00:00.000');
    const endUtc = parseInTimeZone(endDate, '23:59:59.999');

    // 1. Single-pass query to fetch user conversions for aggregating
    const userConversions = await db
      .select()
      .from(conversions)
      .where(
        and(
          eq(conversions.userId, user.id),
          gte(conversions.conversionTime, startUtc),
          lte(conversions.conversionTime, endUtc)
        )
      );

    // 2. Perform Single-pass Aggregation of metrics
    let totalConversions = 0;
    let totalValue = 0;
    let adConversions = 0;

    for (const c of userConversions) {
      totalConversions++;
      if (c.conversionValue) {
        totalValue += parseFloat(c.conversionValue);
      }
      if (c.isAdConversion) {
        adConversions++;
      }
    }

    const adConversionsPercent = totalConversions > 0
      ? Math.round((adConversions / totalConversions) * 100 * 10) / 10
      : 0;

    const metrics = {
      totalConversions,
      totalValue,
      adConversions,
      adConversionsPercent,
    };

    // 3. Dynamic grouping for Line Chart
    const startMs = Date.parse(startDate);
    const endMs = Date.parse(endDate);
    const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

    let lineChartData: { label: string; total: number; ad: number }[] = [];

    const partsStart = getKyivParts(startUtc);
    const partsEnd = getKyivParts(endUtc);

    if (diffDays <= 90) {
      // Group by Day
      const lineChartMap = new Map<string, { label: string; total: number; ad: number }>();
      const current = new Date(Date.UTC(partsStart.year, partsStart.month - 1, partsStart.day));
      const endLimit = new Date(Date.UTC(partsEnd.year, partsEnd.month - 1, partsEnd.day));

      while (current <= endLimit) {
        const dateStr = getKyivDateString(current);
        const { day, month } = getKyivParts(current);
        const label = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
        lineChartMap.set(dateStr, { label, total: 0, ad: 0 });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      for (const c of userConversions) {
        const key = getKyivDateString(c.conversionTime);
        const val = lineChartMap.get(key);
        if (val) {
          val.total++;
          if (c.isAdConversion) {
            val.ad++;
          }
        }
      }
      lineChartData = Array.from(lineChartMap.values());
    } else if (diffDays <= 365) {
      // Group by Week
      const uniqueWeeks = new Set<string>();
      const current = new Date(Date.UTC(partsStart.year, partsStart.month - 1, partsStart.day));
      const endLimit = new Date(Date.UTC(partsEnd.year, partsEnd.month - 1, partsEnd.day));

      while (current <= endLimit) {
        uniqueWeeks.add(getKyivWeekStartString(current));
        current.setUTCDate(current.getUTCDate() + 1);
      }

      const lineChartMap = new Map<string, { label: string; total: number; ad: number }>();
      for (const w of uniqueWeeks) {
        lineChartMap.set(w, { label: w, total: 0, ad: 0 });
      }

      for (const c of userConversions) {
        const key = getKyivWeekStartString(c.conversionTime);
        const val = lineChartMap.get(key);
        if (val) {
          val.total++;
          if (c.isAdConversion) {
            val.ad++;
          }
        }
      }
      lineChartData = Array.from(lineChartMap.values());
    } else {
      // Group by Month
      const uniqueMonths = new Set<string>();
      const current = new Date(Date.UTC(partsStart.year, partsStart.month - 1, partsStart.day));
      const endLimit = new Date(Date.UTC(partsEnd.year, partsEnd.month - 1, partsEnd.day));

      while (current <= endLimit) {
        uniqueMonths.add(getKyivMonthString(current));
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
      uniqueMonths.add(getKyivMonthString(endLimit));

      const lineChartMap = new Map<string, { label: string; total: number; ad: number }>();
      for (const m of uniqueMonths) {
        lineChartMap.set(m, { label: m, total: 0, ad: 0 });
      }

      for (const c of userConversions) {
        const key = getKyivMonthString(c.conversionTime);
        const val = lineChartMap.get(key);
        if (val) {
          val.total++;
          if (c.isAdConversion) {
            val.ad++;
          }
        }
      }
      lineChartData = Array.from(lineChartMap.values());
    }

    // 4. Perform mapping for Pie Charts
    const sourcesCount = { 'Google Ads': 0, 'Meta Ads': 0, 'Organic': 0, 'інше': 0 };
    const channelsCount = { 'Вебсайт': 0, 'Телефонія': 0, 'Месенджери': 0, 'інше': 0 };

    for (const c of userConversions) {
      const src = (c.adSource || '').toLowerCase();
      if (src.includes('google') || src.includes('gads')) {
        sourcesCount['Google Ads']++;
      } else if (src.includes('meta') || src.includes('facebook')) {
        sourcesCount['Meta Ads']++;
      } else if (src.includes('organic')) {
        sourcesCount['Organic']++;
      } else {
        sourcesCount['інше']++;
      }

      const ch = (c.channel || '').toLowerCase();
      if (ch.includes('web') || ch.includes('website')) {
        channelsCount['Вебсайт']++;
      } else if (ch.includes('phone') || ch.includes('telephony')) {
        channelsCount['Телефонія']++;
      } else if (ch.includes('messenger') || ch.includes('telegram')) {
        channelsCount['Месенджери']++;
      } else {
        channelsCount['інше']++;
      }
    }

    const sourcesPie = Object.entries(sourcesCount).map(([name, value]) => ({ name, value }));
    const channelsPie = Object.entries(channelsCount).map(([name, value]) => ({ name, value }));

    // 5. Query table log (up to 100 conversions) with server-side filters
    const logConditions: SQL[] = [
      eq(conversions.userId, user.id),
      gte(conversions.conversionTime, startUtc),
      lte(conversions.conversionTime, endUtc)
    ];

    if (adSource && adSource !== 'all') {
      if (adSource === 'Google Ads') {
        logConditions.push(
          or(
            ilike(conversions.adSource, '%google%'),
            ilike(conversions.adSource, '%gads%')
          ) as SQL
        );
      } else if (adSource === 'Meta Ads') {
        logConditions.push(
          or(
            ilike(conversions.adSource, '%meta%'),
            ilike(conversions.adSource, '%facebook%')
          ) as SQL
        );
      } else if (adSource === 'Organic') {
        logConditions.push(ilike(conversions.adSource, '%organic%'));
      } else if (adSource === 'інше') {
        logConditions.push(
          and(
            not(ilike(conversions.adSource, '%google%')),
            not(ilike(conversions.adSource, '%gads%')),
            not(ilike(conversions.adSource, '%meta%')),
            not(ilike(conversions.adSource, '%facebook%')),
            not(ilike(conversions.adSource, '%organic%'))
          ) as SQL
        );
      }
    }

    if (channel && channel !== 'all') {
      if (channel === 'Вебсайт') {
        logConditions.push(
          or(
            ilike(conversions.channel, '%web%'),
            ilike(conversions.channel, '%website%')
          ) as SQL
        );
      } else if (channel === 'Телефонія') {
        logConditions.push(
          or(
            ilike(conversions.channel, '%phone%'),
            ilike(conversions.channel, '%telephony%')
          ) as SQL
        );
      } else if (channel === 'Месенджери') {
        logConditions.push(
          or(
            ilike(conversions.channel, '%messenger%'),
            ilike(conversions.channel, '%telegram%')
          ) as SQL
        );
      } else if (channel === 'інше') {
        logConditions.push(
          and(
            not(ilike(conversions.channel, '%web%')),
            not(ilike(conversions.channel, '%website%')),
            not(ilike(conversions.channel, '%phone%')),
            not(ilike(conversions.channel, '%telephony%')),
            not(ilike(conversions.channel, '%messenger%')),
            not(ilike(conversions.channel, '%telegram%'))
          ) as SQL
        );
      }
    }

    const tableLog = await db
      .select()
      .from(conversions)
      .where(and(...logConditions))
      .orderBy(desc(conversions.conversionTime))
      .limit(100);

    return NextResponse.json({
      metrics,
      charts: {
        lineChart: lineChartData,
        sourcesPie,
        channelsPie,
      },
      conversions: tableLog.map((c) => ({
        id: c.id,
        date: c.date,
        conversionTime: c.conversionTime.toISOString(),
        conversionName: c.conversionName,
        isAdConversion: c.isAdConversion,
        email: c.email,
        phone: c.phone,
        conversionValue: c.conversionValue,
        orderId: c.orderId,
        ipAddress: c.ipAddress,
        adSource: c.adSource,
        channel: c.channel,
      })),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
