import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export function Screen({ children, refreshing = false, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F3ED' }} edges={['bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 50, width: '100%', maxWidth: 700, alignSelf: 'center' }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
