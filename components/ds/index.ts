// «Гривня» design system — live components barrel.
// Import from "@/components/ds". Vendored reference: docs/design-system/.
// Extensionless paths resolve the .jsx at build time and pick up the
// colocated .d.ts for types. All are client components ('use client').

// Core
export { Badge } from "./core/Badge";
export { Button } from "./core/Button";
export { Card } from "./core/Card";
export { Chip } from "./core/Chip";
export { Icon } from "./core/Icon";
export { IconButton } from "./core/IconButton";
export { Input } from "./core/Input";
export { Select } from "./core/Select";
export { Switch } from "./core/Switch";
export { Tabs } from "./core/Tabs";

// Rates (domain)
export { AsOfBadge } from "./rates/AsOfBadge";
export { Converter } from "./rates/Converter";
export { CurrencyAvatar } from "./rates/CurrencyAvatar";
export { CurrencyPicker } from "./rates/CurrencyPicker";
export { RateChart } from "./rates/RateChart";
export { RateRow } from "./rates/RateRow";
export { TrendBadge, trendTone } from "./rates/TrendBadge";
