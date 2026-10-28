import { useCallback, useContext, useState, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { colors, layout, space } from '../theme';

export function useGutter() {
  const { width } = useWindowDimensions();
  return width < layout.compactBreakpoint ? layout.gutterCompact : layout.gutter;
}

/** Pull-to-refresh state that only spins for user-initiated pulls, not background refreshes. */
export function usePullToRefresh(refresh: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(refresh()).finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}

/**
 * Standard scrolling screen: safe areas, keyboard avoidance (offset by the stack header),
 * optional pull-to-refresh, responsive side gutters and a readable max width on large phones.
 */
export function Screen({ children, refreshing = false, onRefresh, edges = ['bottom', 'left', 'right'], scrollRef }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; edges?: Edge[]; scrollRef?: Ref<ScrollViewInstance>;
}) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const gutter = useGutter();
  return <SafeAreaView style={styles.safe} edges={edges}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} /> : undefined}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { paddingTop: space.xs, paddingBottom: space.xxxl, gap: space.md, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', flexGrow: 1 },
});
