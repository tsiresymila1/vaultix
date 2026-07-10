import { init } from "@instantdb/react-native";

// Same InstantDB app as web. Set EXPO_PUBLIC_INSTANT_APP_ID in your env / app config.
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID ?? "";

export const db = init({ appId: APP_ID });
