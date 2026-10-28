import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
export function Screen({ children, refreshing = false, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center' }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
