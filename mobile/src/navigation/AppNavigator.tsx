import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/Icon";
import { HomeScreen } from "../screens/HomeScreen";
import { LeaderboardScreen } from "../features/leaderboard/screens/LeaderboardScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { CaseDetailScreen } from "../features/cases/screens/CaseDetailScreen";
import { InvestigationScreen } from "../features/investigation/screens/InvestigationScreen";
import { ShopScreen } from "../features/rewards/screens/ShopScreen";
import { EventListScreen } from "../features/events/screens/EventListScreen";
import { EventDetailScreen } from "../features/events/screens/EventDetailScreen";
import { EventLeaderboardScreen } from "../features/events/screens/EventLeaderboardScreen";
import { PlayHubScreen } from "../features/play/PlayHubScreen";
import { SeasonMapScreen } from "../features/seasons/screens/SeasonMapScreen";
import { SeasonLeaderboardScreen } from "../features/seasons/screens/SeasonLeaderboardScreen";
import { FriendsScreen } from "../features/friends/screens/FriendsScreen";
import { PrivacySettingsScreen } from "../features/friends/screens/PrivacySettingsScreen";
import { AchievementsScreen } from "../features/achievements/screens/AchievementsScreen";
import { AgenciesScreen } from "../features/agencies/screens/AgenciesScreen";
import { CreateAgencyScreen } from "../features/agencies/screens/CreateAgencyScreen";
import { AgencyLeaderboardScreen } from "../features/agencies/screens/AgencyLeaderboardScreen";
import { SeasonPassHubScreen } from "../features/pass/screens/SeasonPassHubScreen";
import { PassRewardsScreen } from "../features/pass/screens/PassRewardsScreen";
import { ChallengeCenterScreen } from "../features/challenges/screens/ChallengeCenterScreen";
import { DailyLoginScreen } from "../features/dailyLogin/screens/DailyLoginScreen";
import { CustomizeProfileScreen } from "../features/cosmetics/screens/CustomizeProfileScreen";
import type { AppStackParamList } from "../screens/HomeScreen";

import { colors, typography } from "../theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AppStackParamList>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="Investigation" component={InvestigationScreen} />
      {/* Reachable from the Home banner (tap an event → its detail) */}
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventLeaderboard" component={EventLeaderboardScreen} />
      <Stack.Screen name="DailyLogin" component={DailyLoginScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Agencies" component={AgenciesScreen} />
      <Stack.Screen name="CreateAgency" component={CreateAgencyScreen} />
      <Stack.Screen name="AgencyLeaderboard" component={AgencyLeaderboardScreen} />
      <Stack.Screen name="DailyLogin" component={DailyLoginScreen} />
      <Stack.Screen name="CustomizeProfile" component={CustomizeProfileScreen} />
    </Stack.Navigator>
  );
}

function PlayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayHub" component={PlayHubScreen} />
      {/* Season Pass (monthly battle pass) */}
      <Stack.Screen name="SeasonPassHub" component={SeasonPassHubScreen} />
      <Stack.Screen name="PassRewards" component={PassRewardsScreen} />
      <Stack.Screen name="ChallengeCenter" component={ChallengeCenterScreen} />
      {/* Story Arc */}
      <Stack.Screen name="SeasonMap" component={SeasonMapScreen} />
      <Stack.Screen name="SeasonLeaderboard" component={SeasonLeaderboardScreen} />
      {/* Mega Cases */}
      <Stack.Screen name="EventList" component={EventListScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventLeaderboard" component={EventLeaderboardScreen} />
      {/* Shared play surface (event + chapter modes) */}
      <Stack.Screen name="Investigation" component={InvestigationScreen} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.elevated,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.text.faint,
        tabBarLabelStyle: {
          fontFamily: typography.families.mono,
          fontSize: 9.5,
          letterSpacing: 0.4,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EventsTab"
        component={PlayStack}
        options={{
          tabBarLabel: "Play",
          tabBarIcon: ({ color }) => (
            <Icon name="play" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: "Rankings",
          tabBarIcon: ({ color }) => (
            <Icon name="trophy" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <Icon name="user" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ShopTab"
        component={ShopScreen}
        options={{
          tabBarLabel: "Shop",
          tabBarIcon: ({ color }) => (
            <Icon name="shop" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
