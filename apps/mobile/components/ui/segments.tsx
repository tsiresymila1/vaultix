import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag, font, tint } from "@expo/ui/swift-ui/modifiers";
import { colors } from "@/lib/theme";
export type SegmentsProps<T extends string> = { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] };
export function Segments<T extends string>({ value, onChange, options }: SegmentsProps<T>) {
  return <Host colorScheme="light" seedColor={colors.primary} style={{ width: "100%", height: 52 }}>
    <Picker selection={value} onSelectionChange={onChange} modifiers={[pickerStyle("segmented"), tint(colors.primary)]}>
      {options.map(option => <Text key={option.value} modifiers={[tag(option.value), font({ family: "Poppins_500Medium", size: 12 })]}>{option.label}</Text>)}
    </Picker>
  </Host>;
}
