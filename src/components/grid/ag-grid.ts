import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const invoiceGridTheme = themeQuartz.withParams({
  fontFamily: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  foregroundColor: "#0D1B2E",
  backgroundColor: "#FFFFFF",
  borderColor: "#DCE1E8",
  accentColor: "#1F47C7",
  headerBackgroundColor: "#F3F5F8",
  headerTextColor: "#4F5B6E",
  headerFontWeight: 600,
  rowHoverColor: "#F3F5F8",
  headerHeight: 44,
  rowHeight: 52,
  wrapperBorderRadius: 0,
  wrapperBorder: false,
  oddRowBackgroundColor: "#FFFFFF",
});
