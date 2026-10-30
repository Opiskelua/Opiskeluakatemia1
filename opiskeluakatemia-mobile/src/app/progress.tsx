import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Card, LoadingState, Notice, PageHeader, ProgressBar } from '../components/ui';
import { loadGrade, loadSkills } from '../lib/course';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { maxScale, space, useTheme } from '../theme';
export default function Progress() {
  const { type } = useTheme();
  const grade = useSyncedResource(loadGrade);
  const skills = useSyncedResource(loadSkills);
  const refreshGrade = grade.refresh; const refreshSkills = skills.refresh;
  const pull = usePullToRefresh(useCallback(() => Promise.all([refreshGrade(), refreshSkills()]), [refreshGrade, refreshSkills]));
  return <Screen {...pull}>
    <PageHeader kicker="Oma kehitys" title="Askel kerrallaan." intro="Arvio ja taitoprofiili perustuvat puhelimessa ja verkkokurssilla tekemiisi suorituksiin." />
    {grade.loading && !grade.data && <LoadingState label="Haetaan arviota…" />}
    {!!grade.error && <Notice tone="error" title="Arviota ei voitu hakea" message={grade.error} actionTitle="Päivitä arvio" actionDisabled={grade.loading} onAction={() => void grade.refresh()} />}
    {grade.data && <>
      <Card>
        <Text style={type.overline}>Suuntaa antava arvosana</Text>
        <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat} accessibilityLabel={`Arvosana-arvio ${grade.data.estimation.estimatedGrade}`}>{grade.data.estimation.estimatedGrade}</Text>
        <Text style={type.body}>{Math.round(grade.data.estimation.totalEstimatedPoints)} / 299 pistettä</Text>
        <ProgressBar value={(grade.data.estimation.totalEstimatedPoints / 299) * 100} label="Arvioidut pisteet" />
        <Text style={type.caption}>Harjoitteluun perustuva arvio ei takaa koetulosta. Arvio tarkentuu eri osa-alueiden suoritusten myötä.</Text>
      </Card>
      {Object.entries(grade.data.breakdown).map(([key, item]) => <Card key={key}>
        <View style={{ gap: space.xxs }}>
          <Text accessibilityRole="header" style={type.subheading}>{item.label}</Text>
          <Text style={type.caption}>{item.exercisesCompleted ? `${Math.round(item.rawScore)} % · ${item.exercisesCompleted} suoritusta` : 'Ei vielä suorituksia'}</Text>
        </View>
        <ProgressBar tone="accent" value={item.rawScore} label={`${item.label}, osaaminen`} />
      </Card>)}
    </>}
    {skills.loading && !skills.data && !grade.loading && <LoadingState label="Haetaan taitoprofiilia…" />}
    {!!skills.error && <Notice tone="error" title="Taitoprofiilia ei voitu hakea" message={skills.error} actionTitle="Päivitä taitoprofiili" actionDisabled={skills.loading} onAction={() => void skills.refresh()} />}
    {skills.data && ([['Vahvuudet', skills.data.strengths], ['Harjoittele seuraavaksi', skills.data.weaknesses]] as const).map(([title, items]) => <Card key={title}>
      <Text accessibilityRole="header" style={type.subheading}>{title}</Text>
      {items.length ? items.map(item => <View key={item.skill} style={{ gap: space.xxs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.xs }}>
          <Text style={[type.body, { flex: 1 }]}>{item.label}</Text>
          <Text style={[type.label, { flexShrink: 0 }]}>{Math.round(item.level)} %</Text>
        </View>
        <ProgressBar value={item.level} label={`${item.label}, taso`} />
      </View>) : <Text style={type.body}>Taidot tarkentuvat, kun teet lisää harjoituksia.</Text>}
    </Card>)}
  </Screen>;
}
