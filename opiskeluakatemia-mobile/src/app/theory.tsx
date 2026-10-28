import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Bullet, Card, EmptyState, Field, LoadingState, Notice, PageHeader } from '../components/ui';
import { loadContent } from '../lib/course';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { colors, layout, radii, space, type } from '../theme';
export default function Theory() {
  const { data, loading, error, refresh } = useSyncedResource(loadContent);
  const pull = usePullToRefresh(refresh);
  const [search, setSearch] = useState('');
  // Optional section to open first (from a Polku "Muista sääntö" link).
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [expanded, setExpanded] = useState<string | null>(typeof section === 'string' && /^[a-z0-9-]{1,80}$/i.test(section) ? section : null);
  const sections = data?.theory.filter(s => `${s.title} ${s.content.description}`.toLocaleLowerCase('fi').includes(search.toLocaleLowerCase('fi'))) ?? [];
  return <Screen {...pull}>
    <PageHeader kicker="Kurssikirjasto" title="Kielioppi selkeäksi." intro="Samat säännöt, esimerkit ja yo-vinkit kuin verkkokurssilla." />
    <Field accessibilityLabel="Hae teoriaa" placeholder="Hae aihetta…" value={search} onChangeText={setSearch} returnKeyType="search" clearButtonMode="while-editing" autoCorrect={false} />
    {loading && !data && <LoadingState label="Ladataan teoriaa…" />}
    {!!error && <Notice tone="error" title="Teoriaa ei voitu ladata" message={error} actionTitle="Yritä uudelleen" actionDisabled={loading} onAction={() => void refresh()} />}
    {data && !sections.length && <EmptyState title="Ei hakutuloksia" message="Hakua vastaavia aiheita ei löytynyt. Kokeile toista hakusanaa." />}
    {sections.map(s => {
      const open = expanded === s.id;
      return <Card key={s.id} style={styles.section}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${s.title}, ${s.category}`} accessibilityHint={open ? 'Sulje aihe' : 'Avaa aihe'} accessibilityState={{ expanded: open }}
          onPress={() => setExpanded(open ? null : s.id)} style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: colors.surfacePressed }]}>
          <View style={styles.toggleCopy}>
            <Text style={type.overline}>{s.category}</Text>
            <Text style={type.subheading}>{s.title}</Text>
          </View>
          <Text style={styles.icon} importantForAccessibility="no">{open ? '−' : '+'}</Text>
        </Pressable>
        {open && <View style={styles.body}>
          <Text selectable style={type.body}>{s.content.description}</Text>
          {s.content.rules.map((rule, i) => <Bullet key={i}>{rule}</Bullet>)}
          {s.content.examples.map((e, i) => <View key={i} style={styles.example}>
            <Text selectable style={[type.label, { color: colors.success }]}>✓ {e.correct}</Text>
            {!!e.incorrect && <Text selectable style={[type.caption, { color: colors.danger }]}>✕ Vältä: {e.incorrect}</Text>}
            <Text selectable style={[type.body, styles.small]}>{e.explanation}</Text>
          </View>)}
          {s.content.commonMistakes?.map((m, i) => <Text key={i} selectable style={type.body}>Huomaa: {m}</Text>)}
          {!!s.content.yoExamTips && <View style={styles.tip}><Text style={[type.overline, { color: colors.accentInk }]}>Yo-vinkki</Text><Text selectable style={[type.body, styles.small]}>{s.content.yoExamTips}</Text></View>}
        </View>}
      </Card>;
    })}
  </Screen>;
}
const styles = StyleSheet.create({
  section: { padding: 0, gap: 0 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch + 16, padding: space.md, borderRadius: radii.lg },
  toggleCopy: { flex: 1, minWidth: 0, gap: 2 },
  icon: { fontSize: 24, lineHeight: 28, color: colors.muted, width: 24, textAlign: 'center' },
  body: { gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md },
  example: { gap: space.xxs, padding: space.sm, backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
  tip: { gap: space.xxs, padding: space.sm, backgroundColor: colors.accentSurface, borderRadius: radii.md },
  small: { fontSize: 15, lineHeight: 21 },
});
