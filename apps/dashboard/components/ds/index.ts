// apps/dashboard/components/ds — the barrel (DESIGN.md: "Import from the
// barrel: `import { Button, Card, StatusBadge, RequestCard, SlotChip,
// ChatStream } from "@/components/ds";`"). Every dashboard surface imports
// from here, never from an individual component file directly.

export { Button, IconButton, type ButtonProps, type IconButtonProps, type ButtonVariant } from "./Button.tsx";
export { Input, type InputProps } from "./Input.tsx";
export { Badge, type BadgeProps } from "./Badge.tsx";
export { Card, type CardProps } from "./Card.tsx";
export { Chip, type ChipProps } from "./Chip.tsx";
export { Icon, type IconName, type IconProps } from "./Icon.tsx";
export { statusTone, type StatusTone } from "./statusTone.ts";
export { StatusBadge, type StatusBadgeProps } from "./StatusBadge.tsx";
export { BoundedText, type BoundedTextProps } from "./BoundedText.tsx";
export { LessonBrief, type LessonBriefFields } from "./LessonBrief.tsx";
export { RequestCard, type RequestCardProps } from "./RequestCard.tsx";
export { SlotChip, type SlotChipProps } from "./SlotChip.tsx";
export { EmptyState, type EmptyStateProps } from "./EmptyState.tsx";
export { ConnectionIndicator, type ConnectionIndicatorProps } from "./ConnectionIndicator.tsx";
export { ChatStream, type ChatStreamProps } from "./ChatStream.tsx";
export { DecisionBar, type DecisionBarProps } from "./DecisionBar.tsx";
export { HallMap, type HallMapProps } from "./HallMap.tsx";
export { DeleteLeadButton, type DeleteLeadButtonProps } from "./DeleteLeadButton.tsx";
export { QuestionInbox } from "./QuestionInbox.tsx";
