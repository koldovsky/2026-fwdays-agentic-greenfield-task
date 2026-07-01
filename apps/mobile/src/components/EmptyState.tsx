import { LinearGradient } from 'expo-linear-gradient'
import { Hexagon, Play, Sparkles } from 'lucide-react-native'
import { Text, View } from 'react-native'
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
 * First-run / empty hero per the design system EmptyScreen: a gradient squircle + hexagon
 * resting in a soft amber glow, title, description, and one primary action.
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
			{/* Honey jar — gradient squircle resting in a soft amber glow. The wrapper casts
			    the glow (reliable iOS shadow); the gradient fills it. */}
			<View
				style={{
					marginBottom: t.space[6],
					borderRadius: 26,
					backgroundColor: t.colors.accentPressed,
					shadowColor: t.colors.accent,
					shadowOpacity: 0.6,
					shadowRadius: 24,
					shadowOffset: { width: 0, height: 10 },
					elevation: 12,
				}}
			>
				<LinearGradient
					colors={[t.colors.highlightGold, t.colors.accentPressed]}
					start={{ x: 0.1, y: 0 }}
					end={{ x: 0.9, y: 1 }}
					style={{
						width: 104,
						height: 104,
						borderRadius: 26,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Hexagon size={52} color={t.colors.onAccent} fill={t.colors.onAccent} />
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
							<Play size={20} color={t.colors.onAccent} fill={t.colors.onAccent} />
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
					<Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote }}>
						{tip}
					</Text>
				</View>
			) : null}
		</View>
	)
}
