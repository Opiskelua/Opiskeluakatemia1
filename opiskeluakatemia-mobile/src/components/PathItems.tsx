import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { colors, layout, pressedOpacity, radii, space, type } from '../theme';
import { Button, Card, Pill, ProgressBar } from './ui';
import type { AnswerValue, Answers, GradeResult, ItemFeedback, LessonGuide, PublicItem } from '../lib/path-v2-types';
import { answeredCount, describeAnswer, isAnswered, orderAppend, orderRemaining, orderRemoveAt, orderSentence, splitPrompt, wrongFeedback } from '../lib/path-v2-model';

// Shared item UI for the Polku lesson player and the Kertaus session.

/** Sentence with its `___` blank shown as a visible gap, or filled with the current answer. */
function Sentence({ prompt, fill }: { prompt: string; fill?: string }) {
  const { before, after, blank } = splitPrompt(prompt);
  const filled = !!fill?.trim();
  const spoken = blank ? `${before}${filled ? fill : 'tyhjä kohta'}${after}` : prompt;
  return <Text selectable accessibilityLabel={spoken} style={[type.subheading, styles.sentence]}>
    {before}
    {blank && <Text style={[styles.blank, filled && styles.blankFilled]}>{filled ? fill : ' _____ '}</Text>}
    {after}
  </Text>;
}

function ChoiceItem({ item, value, onChange, disabled }: { item: Extract<PublicItem, { kind: 'choice' }>; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled: boolean }) {
  const selected = typeof value === 'number' ? value : -1;
  return <>
    <Sentence prompt={item.prompt} fill={selected >= 0 ? item.options[selected] : undefined} />
    <View accessibilityRole="radiogroup" style={styles.options}>
      {item.options.map((option, index) => {
        const on = selected === index;
        const letter = String.fromCharCode(65 + index);
        return <Pressable key={index} accessibilityRole="radio" accessibilityLabel={`${letter}. ${option}`} accessibilityState={{ checked: on, disabled }} disabled={disabled}
          onPress={() => onChange(index)}
          style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && !on && { backgroundColor: colors.surfacePressed }]}>
          <View style={[styles.letter, on && styles.letterOn]}>
            <Text style={[styles.letterText, on && { color: colors.white }]} maxFontSizeMultiplier={1.3}>{letter}</Text>
          </View>
          <Text style={[type.body, styles.flex, on && { color: colors.ink, fontWeight: '600' }]}>{option}</Text>
        </Pressable>;
      })}
    </View>
  </>;
}

function GapItem({ item, value, onChange, disabled }: { item: Extract<PublicItem, { kind: 'gap' }>; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled: boolean }) {
  const text = typeof value === 'string' ? value : '';
  return <>
    <Sentence prompt={item.prompt} fill={text} />
    {!!item.hint && <View style={styles.hintRow}><Text style={type.caption}>Vihje</Text><Pill label={item.hint} tone="accent" /></View>}
    <TextInput value={text} onChangeText={onChange} editable={!disabled} maxLength={item.maxLength}
      autoCorrect={false} autoCapitalize="none" autoComplete="off" spellCheck={false} returnKeyType="done"
      placeholder="Kirjoita puuttuva kohta" placeholderTextColor={colors.placeholder}
      accessibilityLabel={`Puuttuva kohta${item.hint ? `, vihje ${item.hint}` : ''}`}
      style={[styles.input, disabled && { opacity: 0.6 }]} />
  </>;
}

function OrderItem({ item, value, onChange, disabled }: { item: Extract<PublicItem, { kind: 'order' }>; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled: boolean }) {
  const chosen = Array.isArray(value) ? value : [];
  const remaining = orderRemaining(item.tokens, chosen);
  const sentence = orderSentence(item.tokens, chosen);
  return <>
    <View style={styles.meaning}>
      <Text style={type.overline}>Merkitys</Text>
      <Text selectable style={[type.subheading, { color: colors.ink }]}>{item.prompt}</Text>
    </View>
    <View accessible={!chosen.length} accessibilityLabel={chosen.length ? undefined : 'Lauseesi on tyhjä'} style={[styles.answerArea, chosen.length > 0 && styles.answerAreaFilled]}>
      {!chosen.length && <Text style={type.caption}>Napauta sanoja alta oikeassa järjestyksessä.</Text>}
      {chosen.map((tokenIndex, position) => <Pressable key={`${tokenIndex}-${position}`} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`${position + 1}. sana: ${item.tokens[tokenIndex]}`} accessibilityHint="Poistaa sanan lauseesta"
        onPress={() => onChange(orderRemoveAt(chosen, position))}
        style={({ pressed }) => [styles.token, styles.tokenPlaced, pressed && { opacity: pressedOpacity }]}>
        <Text style={[styles.tokenText, { color: colors.white }]}>{item.tokens[tokenIndex]}</Text>
      </Pressable>)}
    </View>
    {!!sentence && <Text accessibilityLiveRegion="polite" style={type.caption}>{`Lauseesi: ${sentence}${chosen.length === item.tokens.length ? '.' : ' …'}`}</Text>}
    <View style={styles.tokenBank}>
      {remaining.map(tokenIndex => <Pressable key={tokenIndex} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={item.tokens[tokenIndex]} accessibilityHint="Lisää sanan lauseen loppuun"
        onPress={() => onChange(orderAppend(chosen, tokenIndex, item.tokens.length))}
        style={({ pressed }) => [styles.token, pressed && { backgroundColor: colors.surfacePressed }]}>
        <Text style={styles.tokenText}>{item.tokens[tokenIndex]}</Text>
      </Pressable>)}
      {!remaining.length && <Text style={type.caption}>Kaikki sanat käytetty. Napauta sanaa lauseessa, jos haluat siirtää sen.</Text>}
    </View>
    {chosen.length > 0 && <Button title="Tyhjennä lause" variant="ghost" disabled={disabled} style={styles.clear} onPress={() => onChange([])} />}
  </>;
}

export function ItemView({ item, value, onChange, disabled = false, position, total, context }: {
  item: PublicItem; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled?: boolean; position: number; total: number; context?: string;
}) {
  return <Card style={styles.itemCard}>
    <View style={styles.itemHead}>
      <Text style={type.overline}>Kohta {position} / {total}</Text>
      {!!context && <Text style={[type.caption, styles.flex, { textAlign: 'right' }]} numberOfLines={1}>{context}</Text>}
    </View>
    <Text accessibilityRole="header" style={type.label}>{item.instruction}</Text>
    {item.kind === 'choice' ? <ChoiceItem item={item} value={value} onChange={onChange} disabled={disabled} />
      : item.kind === 'gap' ? <GapItem item={item} value={value} onChange={onChange} disabled={disabled} />
        : <OrderItem item={item} value={value} onChange={onChange} disabled={disabled} />}
  </Card>;
}

/** Segmented progress: one segment per item, filled when answered, outlined for the current one. */
export function ItemProgress({ items, answers, index }: { items: PublicItem[]; answers: Answers; index: number }) {
  const done = answeredCount(items, answers);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`Vastattu ${done} / ${items.length}. Nyt kohta ${index + 1}.`}
    accessibilityValue={{ min: 0, max: items.length, now: done }} style={styles.segments}>
    {items.map((item, i) => <View key={item.id} style={[styles.segment, isAnswered(item, answers[item.id]) && styles.segmentDone, i === index && styles.segmentCurrent]} />)}
  </View>;
}

/** "Muista sääntö": the lesson's rule, worked examples and a theory link, collapsed by default. */
export function GuidePanel({ guide, initiallyOpen = false }: { guide: LessonGuide; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={styles.guide}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Muista sääntö" accessibilityHint={open ? 'Piilottaa säännön' : 'Näyttää säännön ja esimerkit'}
      onPress={() => setOpen(v => !v)} style={({ pressed }) => [styles.guideHead, pressed && { opacity: pressedOpacity }]}>
      <View style={styles.guideBadge}><Text style={styles.guideBadgeText} maxFontSizeMultiplier={1.3}>i</Text></View>
      <Text style={[type.label, styles.flex]}>Muista sääntö</Text>
      <Text style={styles.guideToggle} importantForAccessibility="no" accessibilityElementsHidden>{open ? '−' : '+'}</Text>
    </Pressable>
    {open && <View style={styles.guideBody}>
      <Text selectable style={[type.body, { color: colors.ink }]}>{guide.rule}</Text>
      {guide.examples.map((example, i) => <View key={i} style={styles.example}>
        <Text selectable style={[type.bodyStrong, { fontStyle: 'italic' }]}>{example.sentence}</Text>
        <Text selectable style={type.caption}>{example.note}</Text>
      </View>)}
      {!!guide.reminder && <Text selectable style={[type.body, { fontSize: 15, lineHeight: 21 }]}>Muista: {guide.reminder}</Text>}
      {guide.theory?.kind === 'theory' && <Button title="Avaa teoria" variant="ghost" style={styles.clear} accessibilityHint="Avaa kurssin teoriaosion" onPress={() => router.push({ pathname: '/theory', params: { section: guide.theory!.id } })} />}
    </View>}
  </View>;
}

/** One wrong item in a result: the question, the student's answer and, when revealed, the key and why. */
export function WrongItem({ item, mine, feedback, position }: { item: PublicItem; mine: string; feedback: ItemFeedback; position: number }) {
  const shown = item.kind === 'order' ? item.prompt : item.prompt.replace('___', '_____');
  return <View style={styles.wrong}>
    <Text style={type.overline}>Kohta {position}</Text>
    <Text selectable style={[type.body, { color: colors.ink }]}>{shown}</Text>
    <Text selectable style={[type.body, styles.mine]}><Text style={{ fontWeight: '700' }}>Vastasit: </Text>{mine}</Text>
    {!!feedback.correctAnswer && <Text selectable style={[type.body, styles.key]}><Text style={{ fontWeight: '700' }}>Oikein: </Text>{feedback.correctAnswer}</Text>}
    {!!feedback.explanation && <Text selectable style={[type.body, { fontSize: 15, lineHeight: 21 }]}>{feedback.explanation}</Text>}
  </View>;
}

/** Answered-count bar for the bottom of a session. */
export function AnsweredBar({ items, answers }: { items: PublicItem[]; answers: Answers }) {
  const done = answeredCount(items, answers);
  return <View style={{ gap: space.xs }}>
    <Text style={type.caption}>{done} / {items.length} vastattu</Text>
    <ProgressBar value={items.length ? (done / items.length) * 100 : 0} label="Vastatut kohdat" />
  </View>;
}

/**
 * One item at a time with previous/next navigation. On the last item the caller's
 * `finish` action (submit) is shown, plus a shortcut to the first unanswered item.
 */
export function ItemStepper({ items, answers, onAnswer, index, onIndex, disabled, contextFor, finish }: {
  items: PublicItem[]; answers: Answers; onAnswer: (id: string, value: AnswerValue) => void; index: number; onIndex: (index: number) => void;
  disabled: boolean; contextFor?: (item: PublicItem) => string | undefined; finish: ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const item = items[Math.min(index, items.length - 1)];
  if (!item) return null;
  const last = index >= items.length - 1;
  const missing = items.map((entry, i) => isAnswered(entry, answers[entry.id]) ? -1 : i).filter(i => i >= 0);
  return <View style={{ gap: space.md }}>
    <ItemProgress items={items} answers={answers} index={index} />
    <ItemView key={item.id} item={item} value={answers[item.id]} onChange={value => onAnswer(item.id, value)} disabled={disabled}
      position={index + 1} total={items.length} context={contextFor?.(item)} />
    <View style={[styles.navRow, fontScale > 1.35 && { flexDirection: 'column-reverse' }]}>
      {index > 0 && <Button title="Edellinen" secondary disabled={disabled} style={styles.navButton} onPress={() => onIndex(index - 1)} />}
      {!last && <Button title={isAnswered(item, answers[item.id]) ? 'Seuraava' : 'Ohita'} variant={isAnswered(item, answers[item.id]) ? 'primary' : 'secondary'} disabled={disabled} style={styles.navButton} onPress={() => onIndex(index + 1)} />}
    </View>
    {last && missing.length > 0 && <View style={styles.missing}>
      <Text style={type.label}>Vastaamatta: {missing.length === 1 ? 'kohta' : 'kohdat'} {missing.map(i => i + 1).join(', ')}</Text>
      {missing[0] !== index && <Button title={`Siirry kohtaan ${missing[0] + 1}`} secondary disabled={disabled} onPress={() => onIndex(missing[0])} />}
    </View>}
    {last && finish}
  </View>;
}

/** Wrong items after grading. Without revealed keys (failed checkpoint) only the student's answer is shown. */
export function WrongList({ items, answers, result }: { items: PublicItem[]; answers: Answers; result: GradeResult }) {
  const wrong = wrongFeedback(result.feedback);
  if (!wrong.length) return <Card tone="success"><Text style={[type.bodyStrong, { color: colors.success }]}>Kaikki oikein – hienoa työtä!</Text></Card>;
  return <Card>
    <Text accessibilityRole="header" style={type.subheading}>{result.keysRevealed ? 'Katso, mikä meni väärin' : 'Väärin menneet kohdat'}</Text>
    {!result.keysRevealed && <Text style={type.caption}>Välietapin oikeat vastaukset ja selitykset näytetään vasta, kun läpäiset sen. Kertaa oppituntien säännöt ja yritä uudelleen.</Text>}
    {wrong.map(feedback => {
      const position = items.findIndex(entry => entry.id === feedback.id);
      const item = items[position];
      return item ? <WrongItem key={feedback.id} item={item} feedback={feedback} position={position + 1} mine={describeAnswer(item, answers[item.id])} /> : null;
    })}
  </Card>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  itemCard: { gap: space.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sentence: { color: colors.ink, lineHeight: 28 },
  blank: { color: colors.muted, textDecorationLine: 'underline', textDecorationColor: colors.lineStrong },
  blankFilled: { color: colors.ink, fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: colors.ink },
  options: { gap: space.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch + 8, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.ink, borderWidth: 1.5, backgroundColor: colors.surfaceMuted },
  letter: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letterOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  letterText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  input: { borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 18, lineHeight: 24, color: colors.ink, minHeight: layout.controlHeight },
  meaning: { gap: space.xxs, padding: space.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  answerArea: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: radii.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
  answerAreaFilled: { borderStyle: 'solid', borderColor: colors.ink },
  tokenBank: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  token: { minHeight: layout.minTouch, minWidth: layout.minTouch, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.lineStrong, borderBottomWidth: 3, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tokenPlaced: { backgroundColor: colors.black, borderColor: colors.black },
  tokenText: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.ink },
  clear: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  segments: { flexDirection: 'row', gap: 4 },
  navRow: { flexDirection: 'row', gap: space.sm },
  navButton: { flex: 1 },
  missing: { gap: space.xs, padding: space.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  segment: { flex: 1, height: 8, borderRadius: radii.pill, backgroundColor: colors.track },
  segmentDone: { backgroundColor: colors.ink },
  segmentCurrent: { borderWidth: 2, borderColor: colors.accentInk },
  guide: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.accentSurface, overflow: 'hidden' },
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch + 8, paddingHorizontal: space.md },
  guideBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentInk, alignItems: 'center', justifyContent: 'center' },
  guideBadgeText: { color: colors.white, fontWeight: '700', fontSize: 15, fontStyle: 'italic' },
  guideToggle: { fontSize: 24, lineHeight: 26, color: colors.accentInk, fontWeight: '600' },
  guideBody: { gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md },
  example: { gap: 2, paddingLeft: space.sm, borderLeftWidth: 3, borderLeftColor: colors.accentInk },
  wrong: { gap: space.xxs, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  mine: { color: colors.danger, fontSize: 15, lineHeight: 21 },
  key: { color: colors.success, fontSize: 15, lineHeight: 21 },
});
