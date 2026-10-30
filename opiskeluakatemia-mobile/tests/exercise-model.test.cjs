// Fixture-free unit tests for src/lib/exercise-model.ts (exercises.test.cjs needs the website's data folder).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.resolve(__dirname, '../src/lib/exercise-model.ts');
const loaded = new Module(source, module);
loaded._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, source);
const { plainText, normalizeExercise, allAnswered, grammarScore, submission, parseResult, usesAiGrading, record } = loaded.exports;

const grammar = { id: 'g', title: 'G', category: 'grammar', type: 'cloze-dropdown' };
const reading = { id: 'r', title: 'R', category: 'reading', type: 'reading', path: '/x' };
const listening = { id: 'l', title: 'L', category: 'listening', type: 'listening', path: '/y' };

test('plainText strips markup and decodes each entity exactly once', () => {
  assert.equal(plainText('<p>One</p><p>Two<br/>three</p>'), 'One\n\nTwo\nthree');
  assert.equal(plainText('**Bold** &amp; &quot;q&quot; &#39;a&apos; &lt;tag&gt;&nbsp;x'), 'Bold & "q" \'a\' <tag> x');
  // An escaped entity must stay visible as text, not be decoded a second time.
  assert.equal(plainText('Write &amp;lt;br&amp;gt; literally'), 'Write &lt;br&gt; literally');
  assert.equal(plainText('&lt;script&gt;'), '<script>');
  assert.equal(plainText(undefined), '');
  assert.equal(plainText(42), '');
});

test('record rejects non-objects with a Finnish message', () => {
  for (const value of [null, undefined, 'x', 1, []]) assert.throws(() => record(value), /puutteelliset/);
  assert.deepEqual(record({ a: 1 }), { a: 1 });
});

test('normalizeExercise validates ids, questions and answer keys', () => {
  assert.throws(() => normalizeExercise({ title: 'x', questions: [{ id: 'a' }] }, grammar), /tunniste/);
  assert.throws(() => normalizeExercise({ id: 'x', title: 'x', questions: [] }, grammar), /kysymyksiä/);
  assert.throws(() => normalizeExercise({ id: 'x', title: 'x', questions: [{ question: 'q' }] }, reading), /Kysymyksen tunniste/);
  assert.throws(() => normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', options: ['x'] }, { id: 'a', options: ['y'] }] }, reading), /yksilöllisiä/);
  // Generated grammar must carry a valid key; out-of-range correctIndex is refused.
  assert.throws(() => normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q', options: ['a', 'b'], correctIndex: 2 }] }, grammar), /vastausavain/);
  assert.throws(() => normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q' }] }, grammar), /vastausavain/);
  // Ready-made (server-graded) grammar needs no key.
  const ready = normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q', options: ['a', 'b'] }] }, { ...grammar, path: '/g' });
  assert.equal(ready.serverGraded, true);
  assert.equal(ready.questions[0].correctIndex, undefined);
});

test('normalizeExercise builds prompts, hints and passages', () => {
  const ex = normalizeExercise({
    id: 'x', title: 'T', introText: '<p>Intro</p>', paragraphs: [{ text: 'P1' }], audioUrl: '/a.mp3', splitTime: 30,
    type: 'gap-fill', gaps: [{ id: 'g1', textBefore: 'I', textAfter: 'home.', correctWord: 'went', clue: 'go', verb: 'go' }, { id: 'g2', gapNumber: 7, correctAnswer: 'x' }],
  }, grammar);
  assert.deepEqual(ex.passages, ['Intro', 'P1']);
  assert.equal(ex.questions[0].prompt, 'I _____ home.');
  assert.equal(ex.questions[0].hint, 'go\nVerbi: go');
  assert.deepEqual(ex.questions[0].acceptableAnswers, ['went']);
  assert.equal(ex.questions[1].prompt, 'Aukko 7');
  assert.equal(ex.audioUrl, '/a.mp3');
  assert.equal(ex.splitTime, 30);
  assert.equal(ex.difficulty, 'intermediate');
});

test('multiple-choice-only reading keeps just the MC questions and renames the exercise', () => {
  const ex = normalizeExercise({ id: 'r1', title: 'Read', questions: [
    { id: 'a', type: 'multiple-choice', question: 'q1', options: ['x', 'y'], points: 2 },
    { id: 'b', type: 'open-ended', question: 'q2' },
  ] }, { ...reading, multipleChoiceOnly: true });
  assert.equal(ex.id, 'r1-mc');
  assert.equal(ex.title, 'Read · monivalinta');
  assert.deepEqual(ex.questions.map(q => q.id), ['a']);
  assert.equal(ex.raw.totalPoints, 2);
  assert.equal(usesAiGrading(ex), false);
});

test('allAnswered requires an in-range integer option or non-blank text', () => {
  const ex = normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q', options: ['a', 'b'] }, { id: 'b', question: 'open' }] }, reading);
  assert.equal(allAnswered(ex, { a: 1, b: 'text' }), true);
  assert.equal(allAnswered(ex, { a: 2, b: 'text' }), false);
  assert.equal(allAnswered(ex, { a: -1, b: 'text' }), false);
  assert.equal(allAnswered(ex, { a: 0.5, b: 'text' }), false);
  assert.equal(allAnswered(ex, { a: 0, b: '   ' }), false);
  assert.equal(allAnswered(ex, { a: 0, b: 3 }), false);
  assert.equal(usesAiGrading(ex), true);
});

test('grammarScore ignores case and surrounding space and explains wrong answers', () => {
  const ex = normalizeExercise({ id: 'x', title: 'x', questions: [
    { id: 'a', question: 'q', options: ['in', 'on'], correctIndex: 1, explanation: 'Days take on.' },
    { id: 'b', question: 'q', acceptableAnswers: ['went', 'had gone'] },
  ] }, grammar);
  const right = grammarScore(ex, { a: 1, b: '  WENT ' });
  assert.equal(right.totalScore, 2);
  assert.equal(right.maxScore, 2);
  const wrong = grammarScore(ex, { a: 0, b: 'go' });
  assert.equal(wrong.totalScore, 0);
  assert.equal(wrong.evaluations[0].feedback, 'Oikea vastaus: on. Days take on.');
  assert.equal(wrong.evaluations[1].feedback, 'Oikea vastaus: went.');
});

test('submission routes by category and never sends a client score for server-graded work', () => {
  const generated = normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q', options: ['a', 'b'], correctIndex: 0 }] }, grammar);
  assert.throws(() => submission(generated, {}), /Vastaa kaikkiin/);
  assert.equal(submission(generated, { a: 0 }).body.totalScore, 1);
  const ready = normalizeExercise({ id: 'x', title: 'x', questions: [{ id: 'a', question: 'q', options: ['a', 'b'] }] }, { ...grammar, path: '/g' });
  assert.deepEqual(submission(ready, { a: 0 }), { path: '/api/grammar/evaluate', body: { exerciseId: 'x', answers: { a: 0 } } });
  const read = normalizeExercise({ id: 'r', title: 'r', questions: [{ id: 'a', question: 'q' }] }, reading);
  assert.deepEqual(submission(read, { a: 'x' }).body, { exerciseId: 'r', answers: { a: 'x' } });
  const mc = normalizeExercise({ id: 'l', title: 'l', questions: [{ id: 'a', question: 'q', options: ['a'] }] }, listening);
  assert.equal(submission(mc, { a: 0 }).path, '/api/listening/evaluate-mc');
  const open = normalizeExercise({ id: 'l', title: 'l', questions: [{ id: 'a', question: 'q' }] }, listening);
  assert.equal(submission(open, { a: 'x' }).path, '/api/listening/evaluate');
});

test('parseResult requires a saved attempt and keeps only integer solutions', () => {
  assert.throws(() => parseResult({ totalScore: 1, maxScore: 2 }), /vahvistus/);
  assert.throws(() => parseResult({ attemptId: 'a', totalScore: '1', maxScore: 2 }), /vahvistus/);
  const result = parseResult({ attemptId: 'a', totalScore: 1, maxScore: 2,
    evaluations: [{ questionId: 'q', score: 'x', feedback: '<b>Hyvä</b>' }],
    solutions: { correctIndexes: { q: 1, r: 'x', s: 1.5 }, transcript: 'Text' } });
  assert.deepEqual(result.evaluations, [{ questionId: 'q', score: 0, feedback: 'Hyvä' }]);
  assert.deepEqual(result.correctIndexes, { q: 1 });
  assert.equal(result.transcript, 'Text');
  const bare = parseResult({ attemptId: 'a', totalScore: 0, maxScore: 0 });
  assert.equal(bare.evaluations, undefined);
  assert.equal(bare.correctIndexes, undefined);
  assert.equal(bare.transcript, undefined);
});
