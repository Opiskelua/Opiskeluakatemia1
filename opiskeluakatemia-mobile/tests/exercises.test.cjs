const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.resolve(__dirname, '../src/lib/exercise-model.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const model = new Module(source, module); model._compile(compiled, source);
const { normalizeExercise, allAnswered, grammarScore, submission, parseResult } = model.exports;
const fixtures = path.resolve(__dirname, '../../opiskeluakatemia/data');
// Mirrors stripAnswerKeys in the website's src/lib/course-exercises.ts (what /api/abikurssi/course-exercises returns).
const KEY_FIELDS = new Set(['correctAnswer','correctIndex','correctWord','acceptableAnswers','modelAnswer','explanation','transcript','splitNote']);
const strip = v => Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !KEY_FIELDS.has(k)).map(([k, x]) => [k, strip(x)])) : v;
for (const [folder, category] of [['grammar-exercises','grammar'],['reading-exercises','reading'],['listening-exercises','listening'],['listening-exercises-mc','listening']]) {
  for (const file of fs.readdirSync(path.join(fixtures, folder)).filter(x => x.endsWith('.json'))) {
    test(`website fixture renders on mobile: ${folder}/${file}`, () => {
      const raw = JSON.parse(fs.readFileSync(path.join(fixtures, folder, file)));
      const exercise = normalizeExercise(raw, { category, type: raw.type || 'open-ended' });
      assert.ok(exercise.questions.length > 0); assert.equal(exercise.id, raw.id);
      assert.equal(allAnswered(exercise, {}), false);
      const answers = Object.fromEntries(exercise.questions.map(q => [q.id, q.options ? (q.correctIndex ?? 0) : (q.acceptableAnswers?.[0] ?? 'test answer')]));
      assert.equal(allAnswered(exercise, answers), true);
      const request = submission(exercise, answers);
      assert.equal(request.body.exerciseId, raw.id); assert.deepEqual(request.body.answers, answers);
      if (category === 'grammar') assert.equal(grammarScore(exercise, answers).totalScore, exercise.questions.length);
      if (category === 'reading') assert.equal(request.body.exercise, raw);
      if (category === 'listening') assert.equal(request.path, folder.endsWith('-mc') ? '/api/listening/evaluate-mc' : '/api/listening/evaluate');
    });
    test(`ready-made exercise without answer keys is graded by the server: ${folder}/${file}`, () => {
      const raw = strip(JSON.parse(fs.readFileSync(path.join(fixtures, folder, file))));
      assert.ok(!JSON.stringify(raw).includes('"correctAnswer"') && !JSON.stringify(raw).includes('"correctIndex"'));
      const exercise = normalizeExercise(raw, { category, type: raw.type || 'open-ended', path: `/api/abikurssi/course-exercises/${folder}/${file}` });
      assert.equal(exercise.serverGraded, true);
      const answers = Object.fromEntries(exercise.questions.map(q => [q.id, q.options ? 0 : 'test answer']));
      const request = submission(exercise, answers);
      assert.deepEqual(request.body, { exerciseId: raw.id, answers });
    });
  }
}
test('grammar matches website: trims text, accepts alternatives, keeps option zero', () => {
  const exercise = normalizeExercise({id:'x', title:'Test', questions:[{id:'a',options:['yes','no'],correctIndex:0},{id:'b',correctWord:'colour',acceptableAnswers:['colour','color']}]}, {category:'grammar',type:'error-correction'});
  assert.equal(grammarScore(exercise,{a:0,b:' COLOR '}).totalScore,2);
  assert.equal(grammarScore(exercise,{a:1,b:'wrong'}).totalScore,0);
  assert.throws(() => submission(exercise,{a:0}));
});
test('server solutions reveal correct options and transcript after submission', () => {
  const result = parseResult({ attemptId: 'a', totalScore: 3, maxScore: 6, solutions: { transcript: 'Hello', correctIndexes: { q1: 2, q2: 'x' } } });
  assert.deepEqual(result.correctIndexes, { q1: 2 }); assert.equal(result.transcript, 'Hello');
});
test('malformed response never becomes a saved result', () => {
  assert.throws(() => parseResult({success:true}));
  assert.throws(() => normalizeExercise({id:'x',title:'Test',questions:[{id:'a',options:['one'],correctIndex:2}]},{category:'grammar',type:'articles'}));
});
const originFile = path.resolve(__dirname, '../src/lib/api-origin.ts');
const originModule = new Module(originFile, module);
originModule._compile(ts.transpileModule(fs.readFileSync(originFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,originFile);
test('phone LAN origin resolution preserves explicit and production URLs', () => {
  const resolve = originModule.exports.resolveApiOrigin;
  assert.equal(resolve('http://localhost:3000','192.168.1.50:8081',true,'ios'),'http://192.168.1.50:3000');
  assert.equal(resolve('https://course.example','192.168.1.50:8081',true,'ios'),'https://course.example');
  assert.equal(resolve('http://localhost:3000','192.168.1.50:8081',false,'ios'),'http://localhost:3000');
  assert.equal(resolve('http://localhost:3000','tunnel.exp.direct',true,'ios'),'http://localhost:3000');
  assert.equal(resolve('http://localhost:3000','192.168.1.50:8081',true,'web'),'http://localhost:3000');
});
test('reading MC practice keeps the original text, questions and recalculates points', () => {
  const raw=JSON.parse(fs.readFileSync(path.join(fixtures,'reading-exercises/climate-article.json')));
  const exercise=normalizeExercise(raw,{category:'reading',type:raw.type,multipleChoiceOnly:true});
  assert.ok(exercise.questions.every(q=>q.options));
  assert.ok(exercise.questions.length<raw.questions.length);
  assert.deepEqual(exercise.raw.textSections,raw.textSections);
  assert.equal(exercise.raw.totalPoints,raw.questions.filter(q=>q.type==='multiple-choice').reduce((sum,q)=>sum+q.points,0));
});
