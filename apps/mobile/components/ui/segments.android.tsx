import { Host, SingleChoiceSegmentedButtonRow, SegmentedButton, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@/lib/theme";
import type { SegmentsProps } from "./segments";
export function Segments<T extends string>({ value, onChange, options }: SegmentsProps<T>) {
  return <Host colorScheme="light" seedColor={colors.primary} style={{ width: "100%", height: 52 }}>
    <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
      {options.map(option => <SegmentedButton key={option.value} selected={option.value === value} onClick={() => onChange(option.value)}
        colors={{ activeContainerColor: colors.elevated, activeContentColor: colors.foreground, inactiveContainerColor: colors.background, inactiveContentColor: colors.mutedForeground, activeBorderColor: colors.border, inactiveBorderColor: colors.border }}>
        <SegmentedButton.Label><Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12 }}>{option.label}</Text></SegmentedButton.Label>
      </SegmentedButton>)}
    </SingleChoiceSegmentedButtonRow>
  </Host>;
}
