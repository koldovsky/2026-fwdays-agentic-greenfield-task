import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatHoursShort } from '@honeydo/shared';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatBlock } from '../components/StatBlock';
import { TopTag } from '../components/TopTag';
import { WeekChart } from '../components/WeekChart';
import { EmptyState } from '../components/EmptyState';
import { useStats } from '../hooks/useStats';
import { useTheme } from '../theme';

type Period = 'week' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All time' },
];

/** Stats tab: weekly hours chart, totals, and a per-tag breakdown (FR-STATS-02/03/04). */
export function StatsScreen() {
  const t = useTheme();
  const { weekly, totals, tagTotalsWeek, tagTotalsAll, isLoading, isError } = useStats();
  const [period, setPeriod] = useState<Period>('week');

  const cardStyle = {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    borderCurve: 'continuous',
    padding: t.space[4],
  } as const;

  const cardTitle = {
    color: t.colors.text,
    fontSize: t.fontSize.headline,
    fontWeight: t.fontWeight.bold,
  } as const;

  const tagList = period === 'week' ? tagTotalsWeek : tagTotalsAll;
  const maxTagSec = tagList[0]?.totalSec ?? 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: t.screenGutter, paddingTop: t.space[2], paddingBottom: t.space[2] }}>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          Stats
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space[7] }}>
          <Text style={{ color: t.colors.text, fontSize: t.fontSize.title2, fontWeight: t.fontWeight.heavy, textAlign: 'center' }}>
            Couldn't load your stats
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.callout, textAlign: 'center', marginTop: t.space[2] }}>
            Check your connection and pull the Timer tab to refresh.
          </Text>
        </View>
      ) : totals.allTimeSec === 0 ? (
        <EmptyState
          title="Track time to see your week"
          description="Once you start logging entries, your daily hours, totals, and top tags will show up here."
          tip="Your last 7 days appear as a bar chart."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.screenGutter,
            paddingBottom: t.space[9],
            gap: t.space[4],
          }}
        >
          {/* Totals */}
          <View style={{ flexDirection: 'row', gap: t.space[2] }}>
            <StatBlock value={formatHoursShort(totals.todaySec)} unit="h" label="Today" accent />
            <StatBlock value={formatHoursShort(totals.weekSec)} unit="h" label="This week" />
            <StatBlock value={formatHoursShort(totals.allTimeSec)} unit="h" label="All time" />
          </View>

          {/* Weekly chart */}
          <View style={cardStyle}>
            <Text style={[cardTitle, { marginBottom: t.space[3] }]}>This week</Text>
            <WeekChart data={weekly} />
          </View>

          {/* Top tags */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.space[3], gap: t.space[3] }}>
              <Text style={cardTitle}>Top tags</Text>
              <View style={{ width: 180 }}>
                <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
              </View>
            </View>
            {tagList.length === 0 ? (
              <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead, paddingVertical: t.space[2] }}>
                No tagged time in this period. Add tags to your entries to see where the time goes.
              </Text>
            ) : (
              tagList.map((tag) => (
                <TopTag
                  key={tag.tagId}
                  name={tag.name}
                  color={tag.color}
                  totalSec={tag.totalSec}
                  maxSec={maxTagSec}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
