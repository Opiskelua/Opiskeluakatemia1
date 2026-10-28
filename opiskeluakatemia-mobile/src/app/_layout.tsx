import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../providers/SessionProvider';
import { Button, LoadingState } from '../components/ui';
import { colors, space, type } from '../theme';
function Navigation() {
  const { session, loading } = useSession();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.canvas }}><LoadingState label="Ladataan tiliä" /></View>;
  return <Stack screenOptions={{
    headerStyle: { backgroundColor: colors.canvas },
    headerShadowVisible: false,
    headerTintColor: colors.ink,
    headerTitleStyle: { fontWeight: '600', fontSize: 17, color: colors.ink },
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.canvas },
  }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="exercises" options={{ title: 'Harjoitukset' }} />
      <Stack.Screen name="exercise" options={{ title: 'Harjoitus' }} />
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
  return <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.canvas }}>
    <Text accessibilityRole="header" style={type.title}>Jokin meni pieleen</Text>
    <Text style={type.body}>Näkymää ei voitu näyttää. Tallennetut suorituksesi ovat tallessa. Yritä uudelleen, tai sulje ja avaa sovellus.</Text>
    {__DEV__ && <Text selectable style={[type.caption, { color: colors.danger }]}>{error.message}</Text>}
    <Button title="Yritä uudelleen" onPress={() => void retry()} />
  </View>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><Navigation /></SessionProvider></SafeAreaProvider>;
}
