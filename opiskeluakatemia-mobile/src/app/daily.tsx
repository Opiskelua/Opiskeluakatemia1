import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Button, Card, EmptyState, LoadingState, Notice, PageHeader, ProgressBar } from '../components/ui';
import { loadDailyTasks } from '../lib/course';
import { taskChoice } from '../lib/daily-task-choice';
import { loadPathCached } from '../lib/path-v2';
import { findLesson } from '../lib/path-v2-model';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { space, useTheme } from '../theme';

/** Same rule as the website's Päivän tehtävät card: next Polku lesson, else Kertaus when items are pending, else nothing. */
function PolkuRow() {
  const { type } = useTheme();
  const { data } = useSyncedResource(loadPathCached);
  if (!data) return null;
  const next = data.nextLessonId ? findLesson(data.content.units, data.nextLessonId) : null;
  if (next) return <Card>
    <Text style={type.overline}>Polku · noin 5 min</Text>
    <Text accessibilityRole="header" style={type.subheading}>{next.lesson.title}</Text>
    <Text style={type.caption}>{next.unit.title}</Text>
    <Button title={data.progress[next.lesson.id]?.status === 'in_progress' ? 'Jatka oppituntia' : 'Aloita oppitunti'} onPress={() => router.push({ pathname: '/path-lesson', params: { lessonId: next.lesson.id } })} />
  </Card>;
  if (data.review.pendingItems > 0) return <Card>
    <Text style={type.overline}>Polku · Kertaus</Text>
    <Text accessibilityRole="header" style={type.subheading}>{data.review.pendingItems} kerrattavaa kohtaa</Text>
    <Button title="Aloita kertaus" onPress={() => router.push('/path-review')} />
  </Card>;
  return null;
}

export default function Daily() {
  const { colors, type } = useTheme();
  const { data, loading, error, refresh } = useSyncedResource(loadDailyTasks);
  const pull = usePullToRefresh(refresh);
  const done = data?.tasks.filter(t => t.isCompleted).length ?? 0;
  const total = data?.tasks.length ?? 0;
  return <Screen {...pull}>
    <PageHeader kicker="Päivän suunnitelma" title="Tänään riittää tämä." intro={data?.summary.encouragement || 'Sinulle valitut tehtävät verkkokurssin taitoprofiilisi perusteella.'} />
    {!!data && total > 0 && <View style={{ gap: space.xs }}>
      <Text style={type.label}>{done} / {total} valmiina</Text>
      <ProgressBar tone="success" value={(done / total) * 100} label="Päivän tehtävät valmiina" />
    </View>}
    <PolkuRow />
    {loading && !data && <LoadingState label="Haetaan päivän tehtäviä…" />}
    {!!error && <Notice tone="error" title="Tehtäviä ei voitu hakea" message={error} actionTitle="Yritä uudelleen" actionDisabled={loading} onAction={() => void refresh()} />}
    {data && !total && <EmptyState title="Ei tehtäviä tälle päivälle" message="Voit harjoitella vapaasti valitsemalla harjoituksen." actionTitle="Valitse harjoitus" onAction={() => router.push('/exercises')} />}
    {data?.tasks.map(task => { const choice = taskChoice(task); return <Card key={task.id} tone={task.isCompleted ? 'muted' : 'default'}>
      <Text style={[type.overline, task.isCompleted && { color: colors.success }]}>{task.isCompleted ? '✓ Suoritettu' : task.displayInfo.estimatedTime}</Text>
      <Text accessibilityRole="header" style={type.subheading}>{task.displayInfo.title}</Text>
      <Text style={type.body}>{task.displayInfo.description}</Text>
      <Text style={type.caption}>{task.reason}</Text>
      {!task.isCompleted && (task.taskType === 'essay' ? <Button title="Kirjoita essee" onPress={() => router.push({ pathname: '/essays', params: { taskId: task.id } })} /> : choice ? <Button title="Aloita tehtävä" onPress={() => router.push({ pathname: '/exercise', params: { id: choice.id, difficulty: task.difficulty, taskId: task.id } })} /> : <><Text style={type.caption}>Tälle suositukselle ei löytynyt vastaavaa mobiilitehtävää.</Text><Button title="Valitse harjoitus" secondary onPress={() => router.push('/exercises')} /></>)}
    </Card>; })}
  </Screen>;
}
