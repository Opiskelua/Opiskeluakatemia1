import { useCallback, useContext, useState, type ReactElement, type ReactNode, type Ref } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View, type ListRenderItem, type ScrollViewInstance } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { layout, makeStyles, space, useTheme } from '../theme';

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
  const { colors } = useTheme();
  const styles = useStyles();
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

/**
 * Screen for long lists (e.g. history): the same safe areas, gutters and pull-to-refresh as Screen,
 * but rows are virtualised with FlatList so hundreds of entries do not all render at once.
 * `header` is rendered above the rows; `empty` replaces them when `data` is empty.
 */
export function ListScreen<T>({ data, renderItem, keyExtractor, header, empty, refreshing = false, onRefresh, edges = ['bottom', 'left', 'right'] }: {
  data: readonly T[]; renderItem: ListRenderItem<T>; keyExtractor: (item: T) => string; header?: ReactElement; empty?: ReactElement;
  refreshing?: boolean; onRefresh?: () => void; edges?: Edge[];
}) {
  const gutter = useGutter();
  const { colors } = useTheme();
  const styles = useStyles();
  return <SafeAreaView style={styles.safe} edges={edges}>
    <FlatList data={data} renderItem={renderItem} keyExtractor={keyExtractor} contentInsetAdjustmentBehavior="never"
      ListHeaderComponent={header ? <View style={styles.listHeader}>{header}</View> : undefined} ListEmptyComponent={empty}
      ItemSeparatorComponent={Separator} initialNumToRender={12} windowSize={7} removeClippedSubviews={Platform.OS === 'android'}
      contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} /> : undefined} />
  </SafeAreaView>;
}

function Separator() {
  return <View style={{ height: space.sm }} />;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { paddingTop: space.xs, paddingBottom: space.xxxl, gap: space.md, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', flexGrow: 1 },
  listContent: { paddingTop: space.xs, paddingBottom: space.xxxl, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', flexGrow: 1 },
  listHeader: { gap: space.md, marginBottom: space.md },
}));
