import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

// The colours are the page's own tokens, so the grid follows the light and dark themes.
export const gridTheme = themeQuartz.withParams({
  fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  foregroundColor: "var(--foreground)",
  backgroundColor: "transparent",
  borderColor: "var(--line)",
  accentColor: "var(--primary)",
  headerBackgroundColor: "transparent",
  headerTextColor: "var(--muted-foreground)",
  headerFontWeight: 600,
  rowHoverColor: "var(--hover)",
  headerHeight: 44,
  rowHeight: 48,
  wrapperBorderRadius: 0,
  wrapperBorder: false,
  oddRowBackgroundColor: "transparent",
});
