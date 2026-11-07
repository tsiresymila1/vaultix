import { init } from "@instantdb/react-native";
import type { AppSchema } from "@vaultix/schema";

// Same InstantDB app as web. Set EXPO_PUBLIC_INSTANT_APP_ID in your env / app config.
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID ?? "";

export const db = init<AppSchema>({ appId: APP_ID });
