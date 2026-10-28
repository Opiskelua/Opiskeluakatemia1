import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { choices } from '../lib/catalogue';
import type { Category, Difficulty } from '../lib/exercise-model';
const labels: Record<Category, string> = { grammar: 'Kielioppi ja sanasto', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen' };
export default function Exercises() {
  const [category, setCategory] = useState<Category>('grammar');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  return <Screen>
    <Text style={styles.kicker}>Englannin abikurssi</Text>
    <Text style={styles.title}>Mitä harjoitellaan?</Text>
    <Text style={styles.body}>Samat tehtävätyypit ja tallennetut tulokset kuin verkkopalvelussa.</Text>
    <View style={styles.chipRow}>{(Object.keys(labels) as Category[]).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: category === key }} onPress={() => setCategory(key)} style={[styles.chip, category === key && styles.chipOn]}>
      <Text style={[styles.chipText, category === key && styles.chipTextOn]}>{labels[key]}</Text>
    </Pressable>)}</View>
    {category !== 'listening' && <View style={{ gap: 8 }}>
      <Text style={styles.label}>Uusien tehtävien vaikeustaso</Text>
      <View style={styles.chipRow}>{([['beginner', 'Helppo'], ['intermediate', 'Keskitaso'], ['advanced', 'Haastava']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: difficulty === key }} onPress={() => setDifficulty(key)} style={[styles.chip, difficulty === key && styles.chipOn]}>
        <Text style={[styles.chipText, difficulty === key && styles.chipTextOn]}>{label}</Text>
      </Pressable>)}</View>
    </View>}
    {choices.filter(c => c.category === category).map(choice => <View key={choice.id} style={styles.card}>
      <Text style={styles.kicker}>{choice.path ? 'Valmis harjoitus' : 'Uusi harjoitus'}</Text>
      <Text style={styles.heading}>{choice.title}</Text>
      <Text style={styles.body}>{choice.multipleChoiceOnly ? 'Verkkokurssin lukutehtävän monivalintakysymykset. Arvioidaan ilman tekoälyä.' : choice.path ? 'Verkkokurssin tehtävä. Vastaukset tallentuvat samalle tilille.' : 'Tehtävä luodaan verkkokurssin palvelussa. Luonti voi kestää hetken.'}</Text>
      <Button title="Avaa harjoitus" onPress={() => router.push({ pathname: '/exercise', params: { id: choice.id, difficulty } })} />
    </View>)}
    <Button title="Katso harjoitushistoria" secondary onPress={() => router.push('/history')} />
  </Screen>;
}
