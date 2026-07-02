import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { type DayTotal, formatHoursShort } from '@honeydo/shared';
import { useTheme } from '../theme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Weekday initial for a `YYYY-MM-DD` key, read in local time. */
function weekdayInitial(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAY_INITIALS[new Date(y, m - 1, d).getDay()];
}

interface WeekChartProps {
  /** Seven day totals, oldest first; the last one is treated as "today". */
  data: DayTotal[];
  height?: number;
}

/**
 * Weekly bar chart of tracked hours (FR-STATS-02), drawn with react-native-svg and colored
 * from theme tokens only (TC-STACK-06, FR-THEME-03). Today's bar is highlighted; days with
 * no time render as a flat baseline (no divide-by-zero).
 */
export function WeekChart({ data, height = 150 }: WeekChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setWidth((prev) => (prev === next ? prev : next));
  };

  const labelBand = 20;
  const valueBand = 16;
  const barsHeight = Math.max(0, height - labelBand - valueBand);
  const count = data.length;
  const gap = t.space[2];
  const barWidth = count > 0 && width > 0 ? (width - gap * (count - 1)) / count : 0;
  const maxHours = Math.max(1, ...data.map((d) => d.totalSec / 3600));
  const todayIndex = count - 1;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {data.map((day, i) => {
            const hours = day.totalSec / 3600;
            const barH = hours > 0 ? Math.max((hours / maxHours) * barsHeight, 3) : 0;
            const x = i * (barWidth + gap);
            const y = valueBand + (barsHeight - barH);
            const isToday = i === todayIndex;
            const centerX = x + barWidth / 2;
            return (
              <G key={day.date}>
                {hours > 0 ? (
                  <SvgText
                    x={centerX}
                    y={y - 5}
                    fill={t.colors.textMuted}
                    fontSize={11}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {formatHoursShort(day.totalSec)}
                  </SvgText>
                ) : null}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={t.radius.xs}
                  fill={isToday ? t.colors.accent : t.colors.surfaceAlt}
                  stroke={isToday ? undefined : t.colors.border}
                  strokeWidth={isToday ? 0 : 1}
                />
                <SvgText
                  x={centerX}
                  y={height - 5}
                  fill={isToday ? t.colors.accent : t.colors.textMuted}
                  fontSize={11}
                  fontWeight={isToday ? '700' : '500'}
                  textAnchor="middle"
                >
                  {weekdayInitial(day.date)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
