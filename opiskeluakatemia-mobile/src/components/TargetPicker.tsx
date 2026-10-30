import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, ChipRow, Notice } from './ui';
import { layout, makeStyles, pressedOpacity, radii, space, useTheme } from '../theme';
import { RequestError } from '../lib/api';
import { saveTarget } from '../lib/path-v2';
import { pathFailure } from '../lib/path-v2-model';
import type { CourseId } from '../lib/courses';
import type { PathStateV2, PathSummaryV2, TargetGrade } from '../lib/path-v2-types';
import {
  buildTargetRequest, currentTarget, currentTargetGrade, gradeOptionLabel, seasonLabel, seasonOptions, TARGET_COPY, TARGET_COURSE_COPY, targetErrorMessage,
} from '../lib/target-grade';

/** Target grade form: C/M/E/L, exam season, save / cancel / clear. Copy matches the web TargetForm. */
export function TargetPicker({ state, course, onSaved, onCancel }: {
  /** The course `state` was loaded for: its grade points and its target endpoint. */
  state: PathStateV2; course: CourseId; onSaved: (summary: PathSummaryV2) => void; onCancel?: () => void;
}) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const [grade, setGrade] = useState<TargetGrade | null>(currentTargetGrade(state));
  const [season, setSeason] = useState<string | null>(currentTarget(state)?.examSeason ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const seasons = seasonOptions(state.today, season);
  const copy = TARGET_COURSE_COPY[course];

  async function save(targetGrade: TargetGrade | null) {
    setBusy(true);
    setError(null);
    try {
      const response = await saveTarget(course, buildTargetRequest(state, targetGrade, season));
      if (mounted.current) onSaved(response.summary);
    } catch (e) {
      if (!mounted.current) return;
      const failure = e instanceof RequestError ? pathFailure(e.status, e.code) : 'retry';
      setError(targetErrorMessage(failure, e instanceof RequestError ? e.code : undefined, e instanceof Error ? e.message : 'Tallennus epäonnistui. Yritä uudelleen.'));
    } finally { if (mounted.current) setBusy(false); }
  }

  return <View style={styles.form}>
    <Text style={type.label} accessibilityRole="header">{TARGET_COPY.gradeLegend}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={TARGET_COPY.gradeLegend} style={styles.grades}>
      {copy.options.map(option => {
        const on = grade === option.grade;
        return <Pressable key={option.grade} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: busy }} disabled={busy}
          accessibilityLabel={gradeOptionLabel(option)}
          onPress={() => setGrade(option.grade)}
          style={({ pressed }) => [styles.grade, on && styles.gradeOn, pressed && { opacity: pressedOpacity }]}>
          <View style={[styles.letter, on && styles.letterOn]}>
            <Text style={[styles.letterText, on && { color: colors.onPrimary }]} maxFontSizeMultiplier={1.3}>{option.grade}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={type.label}>{option.label} · {option.points} p</Text>
            {!!option.share && <Text style={type.caption}>{option.share}</Text>}
          </View>
        </Pressable>;
      })}
    </View>
    <Text style={type.label} accessibilityRole="header">{TARGET_COPY.seasonLabel}</Text>
    <ChipRow>
      <Chip label={TARGET_COPY.seasonUnknown} selected={season === null} disabled={busy} onPress={() => setSeason(null)} />
      {seasons.map(s => <Chip key={s} label={seasonLabel(s)} selected={season === s} disabled={busy} onPress={() => setSeason(s)} />)}
    </ChipRow>
    {error && <Notice tone="error" message={error} />}
    <Button title={TARGET_COPY.save} loading={busy} disabled={!grade} onPress={() => { if (grade) void save(grade); }} />
    {onCancel && <Button title={TARGET_COPY.cancel} secondary disabled={busy} onPress={onCancel} />}
    {currentTargetGrade(state) && <Button title={TARGET_COPY.clear} variant="ghost" disabled={busy} onPress={() => void save(null)} />}
    <Text style={type.caption}>{copy.sourceNote}</Text>
  </View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  form: { gap: space.sm },
  grades: { gap: space.xs },
  grade: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch, padding: space.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  gradeOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceMuted },
  letter: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  letterOn: { backgroundColor: colors.primary },
  letterText: { fontSize: 17, fontWeight: '700', color: colors.ink },
}));
