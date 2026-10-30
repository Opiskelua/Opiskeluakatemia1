import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chevron, ProgressBar } from './ui';
import { TargetPicker } from './TargetPicker';
import { layout, makeStyles, pressedOpacity, radii, space, useTheme } from '../theme';
import { findLesson, mergeSummary } from '../lib/path-v2-model';
import type { PathStateV2, PathSummaryV2 } from '../lib/path-v2-types';
import {
  currentTarget, estimateLine, paceLine, raiseRowLabel, supportsTarget, TARGET_COPY, targetEyebrow, targetPercent, targetTitle,
} from '../lib/target-grade';

/**
 * Polku target grade (docs/POLKU_TARGET_GRADE_AND_GUARANTEE.md §2): the picker while no target is
 * set, progress toward it once it is. Renders nothing when the server does not support targets.
 * `onSaved` lets the screen reload; until it does, the card shows the summary the save returned.
 */
export function TargetCard({ state, onSaved }: { state: PathStateV2; onSaved?: () => void }) {
  const { type } = useTheme();
  const styles = useStyles();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  // The saved summary applies only to the state it was saved on; a reload replaces it.
  const [saved, setSaved] = useState<{ base: PathStateV2; summary: PathSummaryV2 } | null>(null);
  const view = saved && saved.base === state ? mergeSummary(state, saved.summary) : state;
  if (!supportsTarget(state)) return null;
  const target = currentTarget(view);
  const done = (summary: PathSummaryV2) => { setSaved({ base: state, summary }); setEditing(false); setOpen(false); onSaved?.(); };
  const close = () => { setEditing(false); setOpen(false); };

  if (!target || editing) {
    return <Card>
      <Text accessibilityRole="header" style={type.subheading}>{TARGET_COPY.pickerTitle}</Text>
      <Text style={type.caption}>{TARGET_COPY.pickerIntro}</Text>
      {!target && !open && <Button title={TARGET_COPY.choose} secondary onPress={() => setOpen(true)} />}
      {(open || editing) && <TargetPicker state={view} onSaved={done} onCancel={close} />}
    </Card>;
  }

  return <Card>
    <View style={styles.head}>
      <View style={styles.badge} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>{target.grade}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={type.overline}>{targetEyebrow(target)}</Text>
        <Text accessibilityRole="header" accessibilityLabel={`Tavoite ${target.grade}: ${targetTitle(target)}`} style={type.subheading}>{targetTitle(target)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Muuta tavoitetta" onPress={() => setEditing(true)} hitSlop={8}
        style={({ pressed }) => [styles.change, pressed && { opacity: pressedOpacity }]}>
        <Text style={styles.changeText}>{TARGET_COPY.change}</Text>
      </Pressable>
    </View>
    <ProgressBar value={targetPercent(target)} tone={targetPercent(target) >= 100 ? 'success' : 'accent'} label={`Tavoite ${target.grade}: oppitunnit tavoitetasolla`} />
    <View accessible accessibilityLabel={`${TARGET_COPY.paceLabel}: ${paceLine(target)}`} style={styles.fact}>
      <Text style={type.overline}>{TARGET_COPY.paceLabel}</Text>
      <Text style={type.body}>{paceLine(target)}</Text>
    </View>
    <View accessible accessibilityLabel={`${TARGET_COPY.estimateLabel}: ${estimateLine(target)}`} style={styles.fact}>
      <Text style={type.overline}>{TARGET_COPY.estimateLabel}</Text>
      <Text style={type.body}>{estimateLine(target)}</Text>
    </View>
    <Text style={type.caption}>{TARGET_COPY.coverage}</Text>
    {/* TODO(mascot): targetReached / behindPace moments go here once their copy exists in mascot-states.json. */}
    {target.belowTarget.length > 0 && <View style={styles.raise}>
      <Text accessibilityRole="header" style={type.label}>{TARGET_COPY.raiseTitle}</Text>
      {target.belowTarget.map(id => {
        const label = raiseRowLabel(findLesson(view.content.units, id)?.lesson.title, id, view.progress[id]?.bestScore);
        return <Pressable key={id} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Avaa oppitunnin"
          onPress={() => router.push({ pathname: '/path-lesson', params: { lessonId: id } })}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <Text style={[type.body, styles.flex]}>{label}</Text>
          <Chevron />
        </Pressable>;
      })}
    </View>}
  </Card>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSurface, borderWidth: 2, borderColor: colors.accentInk },
  badgeText: { fontSize: 20, fontWeight: '700', color: colors.accentInk },
  change: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.xxs },
  changeText: { fontSize: 15, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
  fact: { gap: 2 },
  raise: { gap: space.xxs, marginTop: space.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch, paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  rowPressed: { backgroundColor: colors.surfacePressed },
}));
