import { Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { loadGrade, loadSkills } from '../lib/course';
import { useSyncedResource } from '../hooks/useSyncedResource';
export default function Progress() {
  const grade = useSyncedResource(loadGrade);
  const skills = useSyncedResource(loadSkills);
  return <Screen refreshing={grade.loading || skills.loading} onRefresh={() => { void grade.refresh(); void skills.refresh(); }}>
    <Text style={styles.kicker}>Oma kehitys</Text><Text style={styles.title}>Askel kerrallaan.</Text>
    <Text style={styles.body}>Arvio ja taitoprofiili perustuvat puhelimessa ja verkkokurssilla tekemiisi suorituksiin.</Text>
    {grade.loading && !grade.data && <Text style={styles.body}>Haetaan arviota…</Text>}
    {!!grade.error && <><Text style={styles.error}>{grade.error}</Text><Button title="Päivitä arvio" onPress={() => void grade.refresh()} /></>}
    {grade.data && <><View style={styles.card}><Text style={styles.kicker}>Suuntaa antava arvosana</Text><Text style={styles.score}>{grade.data.estimation.estimatedGrade}</Text><Text style={styles.body}>{Math.round(grade.data.estimation.totalEstimatedPoints)} / 299 pistettä</Text><Text style={styles.footer}>Harjoitteluun perustuva arvio ei takaa koetulosta. Arvio tarkentuu eri osa-alueiden suoritusten myötä.</Text></View>
      {Object.entries(grade.data.breakdown).map(([key, item]) => <View key={key} style={styles.card}><Text style={styles.heading}>{item.label}</Text><Text style={styles.body}>{item.exercisesCompleted ? `${Math.round(item.rawScore)} % · ${item.exercisesCompleted} suoritusta` : 'Ei vielä suorituksia'}</Text><View style={{ height: 8, borderRadius: 4, backgroundColor: '#E9E9EC', overflow: 'hidden' }}><View style={{ height: 8, backgroundColor: '#B7A06C', width: `${Math.min(100, Math.max(0, item.rawScore))}%` }} /></View></View>)}
    </>}
    {!!skills.error && <><Text style={styles.error}>{skills.error}</Text><Button title="Päivitä taitoprofiili" onPress={() => void skills.refresh()} /></>}
    {skills.data && ([['Vahvuudet', skills.data.strengths], ['Harjoittele seuraavaksi', skills.data.weaknesses]] as const).map(([title, items]) => <View style={styles.card} key={title}><Text style={styles.heading}>{title}</Text>{items.length ? items.map(item => <Text key={item.skill} style={styles.body}>{item.label} · {Math.round(item.level)} %</Text>) : <Text style={styles.body}>Taidot tarkentuvat, kun teet lisää harjoituksia.</Text>}</View>)}
  </Screen>;
}
