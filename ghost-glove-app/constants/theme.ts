// Ghost Glove Design System — single source of truth
export const colours = {
  primary: "#39FF6A",   // Electric green — CTAs, active states, highlights
  background: "#111310", // Near-black — all screens
  secondary: "#1F2E22", // Dark green — cards, panels
  neutral: "#8A9E8D",   // Muted sage — labels, timestamps, secondary data
  warning: "#FF4444",   // Red — errors, alerts
  white: "#F0F7F1",     // Off-white — body text
} as const;

// Typography scale (fontSize values for React Native)
export const type = {
  hero: 48,          // Space Grotesk Bold — hero moments only (rep count)
  title: 32,         // Space Grotesk — screen titles, primary stats
  sectionHeader: 20, // Space Grotesk — section headers, exercise names
  body: 16,          // Space Grotesk — body text, descriptions
  label: 12,         // Space Mono — labels, timestamps, data readouts
  // ⚠️ Always render 12px in neutral (#8A9E8D), never white
} as const;

export const fonts = {
  grotesk: {
    regular: "SpaceGrotesk_400Regular",
    medium: "SpaceGrotesk_500Medium",
    semiBold: "SpaceGrotesk_600SemiBold",
    bold: "SpaceGrotesk_700Bold",
  },
  mono: {
    regular: "SpaceMono_400Regular",
    bold: "SpaceMono_700Bold",
  },
} as const;

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius
export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
} as const;
