import { SegmentedButtons } from "react-native-paper";
export type SegmentsProps<T extends string> = { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] };
export function Segments<T extends string>({ value, onChange, options }: SegmentsProps<T>) { return <SegmentedButtons value={value} onValueChange={next => onChange(next as T)} buttons={options.map(option => ({ ...option, labelStyle: { fontFamily: "Poppins_500Medium", fontSize: 12 } }))} />; }
