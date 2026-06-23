import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme";

/**
 * Centralized UI icon component. Maps internal semantic names to vector icons
 * from @expo/vector-icons so functional icons (badges, buttons, status, tabs)
 * render identically across OS/devices instead of relying on emoji glyphs.
 *
 * Add new UI icons here rather than using raw emoji in screens.
 */

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type MaterialName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type IconEntry =
  | { lib: "ion"; icon: IoniconName }
  | { lib: "material"; icon: MaterialName };

export const ICONS = {
  streak: { lib: "ion", icon: "flame" },
  trophy: { lib: "ion", icon: "trophy" },
  search: { lib: "material", icon: "magnify" },
  user: { lib: "ion", icon: "person" },
  coin: { lib: "material", icon: "cash-multiple" },
  star: { lib: "ion", icon: "star" },
  checkCircle: { lib: "ion", icon: "checkmark-circle" },
  closeCircle: { lib: "ion", icon: "close-circle" },
  hint: { lib: "ion", icon: "bulb" },
  lock: { lib: "ion", icon: "lock-closed" },
  home: { lib: "ion", icon: "home" },
  shop: { lib: "ion", icon: "cart" },
  back: { lib: "ion", icon: "chevron-back" },
  clock: { lib: "ion", icon: "time" },
  target: { lib: "ion", icon: "locate" },
  medal: { lib: "ion", icon: "medal" },
  warning: { lib: "ion", icon: "warning" },
  scales: { lib: "material", icon: "scale-balance" },
  chat: { lib: "ion", icon: "chatbubbles" },
  calendar: { lib: "ion", icon: "calendar" },
  play: { lib: "ion", icon: "play" },
  // extra UI icons used across screens
  check: { lib: "ion", icon: "checkmark" },
  close: { lib: "ion", icon: "close" },
  arrowRight: { lib: "ion", icon: "arrow-forward" },
  bolt: { lib: "ion", icon: "flash" },
  people: { lib: "ion", icon: "people" },
  moon: { lib: "ion", icon: "moon" },
  sparkles: { lib: "ion", icon: "sparkles" },
  folder: { lib: "ion", icon: "folder-open" },
  tag: { lib: "ion", icon: "pricetag" },
  // category icons (crime types, ranks, avatars, titles)
  crown: { lib: "material", icon: "crown" },
  incognito: { lib: "material", icon: "incognito" },
  brain: { lib: "material", icon: "brain" },
  ghost: { lib: "material", icon: "ghost" },
  knife: { lib: "material", icon: "knife" },
  cash: { lib: "material", icon: "cash" },
  bomb: { lib: "material", icon: "bomb" },
  masks: { lib: "material", icon: "drama-masks" },
  menu: { lib: "ion", icon: "menu" },
  logout: { lib: "ion", icon: "log-out-outline" },
} satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof Ionicons>["style"];
}

export function Icon({ name, size = 20, color = colors.text.primary, style }: Props) {
  const entry = ICONS[name];
  if (entry.lib === "material") {
    return (
      <MaterialCommunityIcons
        name={entry.icon}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return <Ionicons name={entry.icon} size={size} color={color} style={style} />;
}
