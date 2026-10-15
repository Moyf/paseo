// The test alias for `react-native` points here instead of straight at react-native-web, so the
// handful of exports the app uses but react-native-web does not implement (native-only toast
// module) resolve during tests.
// @ts-expect-error react-native-web ships no type declarations; the app imports `react-native`.
export * from "react-native-web";

export const ToastAndroid = {
  show: () => undefined,
  SHORT: "SHORT",
  LONG: "LONG",
  TOP: "TOP",
  BOTTOM: "BOTTOM",
  CENTER: "CENTER",
} as const;
