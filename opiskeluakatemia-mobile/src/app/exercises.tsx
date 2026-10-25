import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { choices } from '../lib/catalogue';
import type { Category, Difficulty } from '../lib/exercise-model';
const labels: Record<Category, string> = { grammar: 'Kielioppi ja sanasto', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen' };
export default function Exercises() {
  const [category, setCategory] = useState<Category>('grammar');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  return <Screen>
    <Text style={styles.title}>Mitä harjoitellaan?</Text>
    <Text style={styles.body}>Samat tehtävätyypit ja tallennetut tulokset kuin verkkopalvelussa.</Text>
    <Button title="Katso harjoitushistoria" secondary onPress={() => router.push('/history')} />
    <View style={{ gap: 8 }}>{(Object.keys(labels) as Category[]).map(key => <Button key={key} title={labels[key]} secondary={category !== key} onPress={() => setCategory(key)} />)}</View>
    {category !== 'listening' && <View style={styles.card}><Text style={styles.label}>Uusien tehtävien vaikeustaso</Text>{([['beginner', 'Helppo'], ['intermediate', 'Keskitaso'], ['advanced', 'Haastava']] as const).map(([key, label]) => <Button key={key} title={label} secondary={difficulty !== key} onPress={() => setDifficulty(key)} />)}</View>}
    {choices.filter(c => c.category === category).map(choice => <View key={choice.id} style={styles.card}>
      <Text style={styles.eyebrow}>{choice.path ? 'VALMIS HARJOITUS' : 'UUSI HARJOITUS'}</Text>
      <Text style={styles.heading}>{choice.title}</Text>
      <Text style={styles.body}>{choice.multipleChoiceOnly ? 'Verkkokurssin lukutehtävän monivalintakysymykset. Arvioidaan ilman tekoälyä.' : choice.path ? 'Verkkokurssin tehtävä. Vastaukset tallentuvat samalle tilille.' : 'Tehtävä luodaan verkkokurssin palvelussa. Luonti voi kestää hetken.'}</Text>
      <Button title="Avaa harjoitus →" onPress={() => router.push({ pathname: '/exercise', params: { id: choice.id, difficulty } })} />
    </View>)}
  </Screen>;
}
