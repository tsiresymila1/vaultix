import { Children } from "react";
import { StyleSheet, View } from "react-native";
import { Host, LazyColumn, LazyRow, PullToRefreshBox, RNHostView } from "@expo/ui/jetpack-compose";
import { fillMaxSize, fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@/lib/theme";
import type { ScreenScrollProps } from "./screen-scroll";
export function ScreenScroll({ children, horizontal, contentContainerStyle, onRefresh, refreshing, keyboardShouldPersistTaps, showsVerticalScrollIndicator, showsHorizontalScrollIndicator, style, ...props }: ScreenScrollProps) {
  const padding = StyleSheet.flatten(contentContainerStyle) ?? {};
  const numeric = (value: unknown) => typeof value === "number" ? value : 0;
  const List = horizontal ? LazyRow : LazyColumn;
  const content = <List modifiers={[fillMaxSize()]} contentPadding={{ start: numeric(padding.paddingLeft ?? padding.paddingHorizontal ?? padding.padding ?? 0), end: numeric(padding.paddingRight ?? padding.paddingHorizontal ?? padding.padding ?? 0), top: numeric(padding.paddingTop ?? padding.paddingVertical ?? padding.padding ?? 0), bottom: numeric(padding.paddingBottom ?? padding.paddingVertical ?? padding.padding ?? 0) }}>
    {Children.toArray(children).map((child, index) => <RNHostView key={typeof child === "object" && "key" in child ? child.key ?? index : index} matchContents={horizontal ? true : { vertical: true }} modifiers={horizontal ? [] : [fillMaxWidth()]}>
      <View style={horizontal ? undefined : { width: "100%" }}>{child}</View>
    </RNHostView>)}
  </List>;
  return <View {...props} style={[horizontal ? { height: 64 } : { flex: 1 }, style]}>
    <Host colorScheme="light" seedColor={colors.primary} style={{ flex: 1 }}>
      {onRefresh ? <PullToRefreshBox isRefreshing={!!refreshing} onRefresh={() => { void onRefresh(); }} modifiers={[fillMaxSize()]} indicator={{ color: colors.primary, containerColor: colors.card }}>{content}</PullToRefreshBox> : content}
    </Host>
  </View>;
}
