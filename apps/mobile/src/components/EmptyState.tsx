import { LinearGradient } from 'expo-linear-gradient'
import { Hexagon, Play, Sparkles } from 'lucide-react-native'
import { Text, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { Button } from './Button'
import { useTheme } from '../theme'

interface EmptyStateProps {
	title: string
	description: string
	actionLabel?: string
	onAction?: () => void
	tip?: string
}

/**
 * First-run / empty hero per the design system EmptyScreen: a honey-jar mark (gradient
 * squircle + hexagon in an amber glow), title, description, and one primary action.
 */
export function EmptyState({
	title,
	description,
	actionLabel,
	onAction,
	tip,
}: EmptyStateProps) {
	const t = useTheme()
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				paddingHorizontal: t.space[7],
				gap: t.space[3],
			}}
		>
			{/* Honey jar — a soft amber halo behind a gradient squircle, waiting to fill */}
			<View
				style={{
					width: 140,
					height: 140,
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: t.space[4],
				}}
			>
				<Svg width={140} height={140} style={{ position: 'absolute' }}>
					<Defs>
						<RadialGradient id='honeyHalo' cx='50%' cy='42%' r='55%'>
							<Stop offset='0%' stopColor={t.colors.accent} stopOpacity={0.3} />
							<Stop offset='100%' stopColor={t.colors.accent} stopOpacity={0} />
						</RadialGradient>
					</Defs>
					<Circle cx={70} cy={70} r={70} fill='url(#honeyHalo)' />
				</Svg>
				<LinearGradient
					colors={[t.colors.highlightGold, t.colors.accentPressed]}
					start={{ x: 0.15, y: 0 }}
					end={{ x: 0.85, y: 1 }}
					style={{
						width: 96,
						height: 96,
						borderRadius: 24,
						alignItems: 'center',
						justifyContent: 'center',
						shadowColor: t.colors.accent,
						shadowOpacity: 0.45,
						shadowRadius: 22,
						shadowOffset: { width: 0, height: 0 },
					}}
				>
					<Hexagon
						size={48}
						color={t.colors.onAccent}
						fill={t.colors.onAccent}
					/>
				</LinearGradient>
			</View>

			<Text
				style={{
					color: t.colors.text,
					fontSize: t.fontSize.title2,
					fontWeight: t.fontWeight.heavy,
					textAlign: 'center',
				}}
			>
				{title}
			</Text>
			<Text
				style={{
					color: t.colors.textMuted,
					fontSize: t.fontSize.callout,
					lineHeight: t.fontSize.callout * t.lineHeight.relaxed,
					textAlign: 'center',
					maxWidth: 300,
				}}
			>
				{description}
			</Text>

			{actionLabel && onAction ? (
				<View style={{ alignSelf: 'stretch', marginTop: t.space[4] }}>
					<Button
						onPress={onAction}
						leadingIcon={
							<Play
								size={20}
								color={t.colors.onAccent}
								fill={t.colors.onAccent}
							/>
						}
					>
						{actionLabel}
					</Button>
				</View>
			) : null}

			{tip ? (
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						gap: t.space[2],
						marginTop: t.space[3],
					}}
				>
					<Sparkles size={14} color={t.colors.accent} />
					<Text
						style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote }}
					>
						{tip}
					</Text>
				</View>
			) : null}
		</View>
	)
}
