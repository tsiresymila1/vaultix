import { View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import { Text } from "./text";
import { useAppTheme } from "@/lib/theme";

export type SegmentsProps<T extends string> = { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] };
export function Segments<T extends string>({ value, onChange, options }: SegmentsProps<T>) {
  const { colors } = useAppTheme();
  return <View className="flex-row gap-2">
    {options.map(option => {
      const selected = value === option.value;
      return <TouchableRipple
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        borderless
        style={{ borderRadius: 20, backgroundColor: selected ? colors.elevated : "transparent", borderWidth: 1, borderColor: selected ? colors.elevated : colors.border }}
      >
        <View className="flex-row items-center px-4" style={{ height: 36 }}>
          <Text style={{ color: selected ? colors.primary : colors.mutedForeground, fontSize: 12, fontFamily: "Outfit_500Medium" }}>{option.label}</Text>
        </View>
      </TouchableRipple>;
    })}
  </View>;
}
