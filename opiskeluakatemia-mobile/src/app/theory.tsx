import { useState } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { loadContent } from '../lib/course';
import { useSyncedResource } from '../hooks/useSyncedResource';
export default function Theory() {
  const { data, loading, error, refresh } = useSyncedResource(loadContent);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const sections = data?.theory.filter(s => `${s.title} ${s.content.description}`.toLocaleLowerCase('fi').includes(search.toLocaleLowerCase('fi'))) ?? [];
  return <Screen refreshing={loading} onRefresh={() => void refresh()}>
    <Text style={styles.kicker}>Kurssikirjasto</Text><Text style={styles.title}>Kielioppi selkeäksi.</Text>
    <Text style={styles.body}>Samat säännöt, esimerkit ja yo-vinkit kuin verkkokurssilla.</Text>
    <TextInput accessibilityLabel="Hae teoriaa" placeholder="Hae aihetta…" value={search} onChangeText={setSearch} style={styles.input} />
    {loading && !data && <Text style={styles.body}>Ladataan teoriaa…</Text>}
    {!!error && <><Text style={styles.error}>{error}</Text><Button title="Yritä uudelleen" onPress={() => void refresh()} /></>}
    {data && !sections.length && <Text style={styles.body}>Hakua vastaavia aiheita ei löytynyt.</Text>}
    {sections.map(s => <View key={s.id} style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === s.id }} onPress={() => setExpanded(expanded === s.id ? null : s.id)} style={{ gap: 8, minHeight: 48 }}>
        <Text style={styles.kicker}>{s.category}</Text><Text style={styles.heading}>{s.title} {expanded === s.id ? '−' : '+'}</Text>
      </Pressable>
      {expanded === s.id && <><Text style={styles.body}>{s.content.description}</Text>
        {s.content.rules.map((rule, i) => <Text key={i} style={styles.body}>• {rule}</Text>)}
        {s.content.examples.map((e, i) => <View key={i} style={styles.note}><Text selectable style={styles.label}>{e.correct}</Text>{!!e.incorrect && <Text style={styles.muted}>Vältä: {e.incorrect}</Text>}<Text style={styles.body}>{e.explanation}</Text></View>)}
        {s.content.commonMistakes?.map((m, i) => <Text key={i} style={styles.body}>Huomaa: {m}</Text>)}
        {!!s.content.yoExamTips && <View style={styles.note}><Text style={styles.kicker}>Yo-vinkki</Text><Text style={styles.body}>{s.content.yoExamTips}</Text></View>}
      </>}
    </View>)}
  </Screen>;
}
