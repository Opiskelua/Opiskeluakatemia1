import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../providers/SessionProvider';
function Navigation() {
  const { session } = useSession();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: '#F5F3ED' }, headerTintColor: '#192C27', contentStyle: { backgroundColor: '#F5F3ED' } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="exercises" options={{ title: 'Harjoitukset' }} />
      <Stack.Screen name="exercise" options={{ title: 'Harjoittele' }} />
      <Stack.Screen name="history" options={{ title: 'Harjoitushistoria' }} />
    </Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><Navigation /></SessionProvider></SafeAreaProvider>;
}
