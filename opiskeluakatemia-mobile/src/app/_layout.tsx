import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
      <Stack.Screen name="settings" options={{ title: 'Tili' }} />
    </Stack.Protected>
  </Stack>;
}
// Shown instead of a blank screen if rendering fails. Internal details are only visible in development.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: colors.canvas }}>
    <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', color: colors.ink }}>Jokin meni pieleen</Text>
    <Text style={{ fontSize: 15, lineHeight: 22, color: '#5C5C61' }}>Näkymää ei voitu näyttää. Tallennetut suorituksesi ovat tallessa. Yritä uudelleen, tai sulje ja avaa sovellus.</Text>
    {__DEV__ && <Text selectable style={{ fontSize: 12, color: colors.danger }}>{error.message}</Text>}
    <Pressable accessibilityRole="button" onPress={() => void retry()} style={({ pressed }) => ({ minHeight: 52, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>Yritä uudelleen</Text>
    </Pressable>
  </View>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><Navigation /></SessionProvider></SafeAreaProvider>;
}
