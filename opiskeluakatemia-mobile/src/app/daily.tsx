import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { loadDailyTasks } from '../lib/course';
import { taskChoice } from '../lib/daily-task-choice';
import { useSyncedResource } from '../hooks/useSyncedResource';
export default function Daily() {
  const { data, loading, error, refresh } = useSyncedResource(loadDailyTasks);
  return <Screen refreshing={loading} onRefresh={() => void refresh()}>
    <Text style={styles.kicker}>Päivän suunnitelma</Text><Text style={styles.title}>Tänään riittää tämä.</Text>
    <Text style={styles.body}>{data?.summary.encouragement || 'Sinulle valitut tehtävät verkkokurssin taitoprofiilisi perusteella.'}</Text>
    {!!data && <Text style={styles.heading}>{data.tasks.filter(t => t.isCompleted).length} / {data.tasks.length} valmiina</Text>}
    {loading && !data && <Text style={styles.body}>Haetaan päivän tehtäviä…</Text>}
    {!!error && <><Text style={styles.error}>{error}</Text><Button title="Yritä uudelleen" onPress={() => void refresh()} /></>}
    {data?.tasks.map(task => { const choice = taskChoice(task); return <View key={task.id} style={styles.card}>
      <Text style={styles.kicker}>{task.isCompleted ? '✓ Suoritettu' : task.displayInfo.estimatedTime}</Text>
      <Text style={styles.heading}>{task.displayInfo.title}</Text><Text style={styles.body}>{task.displayInfo.description}</Text><Text style={styles.muted}>{task.reason}</Text>
      {!task.isCompleted && (task.taskType === 'essay' ? <Button title="Kirjoita essee" onPress={() => router.push({ pathname: '/essays', params: { taskId: task.id } })} /> : choice ? <Button title="Aloita tehtävä" onPress={() => router.push({ pathname: '/exercise', params: { id: choice.id, difficulty: task.difficulty, taskId: task.id } })} /> : <><Text style={styles.footer}>Tälle suositukselle ei löytynyt vastaavaa mobiilitehtävää.</Text><Button title="Valitse harjoitus" secondary onPress={() => router.push('/exercises')} /></>)}
    </View>; })}
  </Screen>;
}
