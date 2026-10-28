import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Chip, ChipRow, NavCard, PageHeader } from '../components/ui';
import { choices } from '../lib/catalogue';
import type { Category, Difficulty } from '../lib/exercise-model';
import { space, type } from '../theme';
const labels: Record<Category, string> = { grammar: 'Kielioppi ja sanasto', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen' };
export default function Exercises() {
  const [category, setCategory] = useState<Category>('grammar');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  return <Screen>
    <PageHeader kicker="Englannin abikurssi" title="Mitä harjoitellaan?" intro="Samat tehtävätyypit ja tallennetut tulokset kuin verkkopalvelussa." />
    <View style={{ gap: space.xs }}>
      <Text style={type.label}>Osa-alue</Text>
      <ChipRow>{(Object.keys(labels) as Category[]).map(key => <Chip key={key} label={labels[key]} selected={category === key} onPress={() => setCategory(key)} />)}</ChipRow>
    </View>
    {category !== 'listening' && <View style={{ gap: space.xs }}>
      <Text style={type.label}>Uusien tehtävien vaikeustaso</Text>
      <ChipRow>{([['beginner', 'Helppo'], ['intermediate', 'Keskitaso'], ['advanced', 'Haastava']] as const).map(([key, label]) => <Chip key={key} label={label} selected={difficulty === key} onPress={() => setDifficulty(key)} />)}</ChipRow>
    </View>}
    {choices.filter(c => c.category === category).map(choice => <NavCard key={choice.id}
      kicker={choice.path ? 'Valmis harjoitus' : 'Uusi harjoitus'} title={choice.title}
      description={choice.multipleChoiceOnly ? 'Verkkokurssin lukutehtävän monivalintakysymykset. Arvioidaan ilman tekoälyä.' : choice.path ? 'Verkkokurssin tehtävä. Vastaukset tallentuvat samalle tilille.' : 'Tehtävä luodaan verkkokurssin palvelussa. Luonti voi kestää hetken.'}
      accessibilityHint="Avaa harjoituksen"
      onPress={() => router.push({ pathname: '/exercise', params: { id: choice.id, difficulty } })} />)}
    <Button title="Katso harjoitushistoria" secondary onPress={() => router.push('/history')} />
  </Screen>;
}
