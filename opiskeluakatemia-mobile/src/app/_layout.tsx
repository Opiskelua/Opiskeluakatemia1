import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../providers/SessionProvider';
import { colors } from '../theme';
function Navigation() {
  const { session, loading } = useSession();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator accessibilityLabel="Ladataan tiliä" color={colors.ink} /></View>;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '600', fontSize: 16, color: colors.ink }, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="exercises" options={{ title: 'Harjoitukset' }} />
      <Stack.Screen name="exercise" options={{ title: 'Harjoittele' }} />
      <Stack.Screen name="flashcards" options={{ title: 'Muistikortit' }} />
      <Stack.Screen name="daily" options={{ title: 'Päivän tehtävät' }} />
      <Stack.Screen name="theory" options={{ title: 'Teoria' }} />
      <Stack.Screen name="progress" options={{ title: 'Edistyminen' }} />
      <Stack.Screen name="essays" options={{ title: 'Kirjoitelmat' }} />
      <Stack.Screen name="history" options={{ title: 'Harjoitushistoria' }} />
    </Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><Navigation /></SessionProvider></SafeAreaProvider>;
}
