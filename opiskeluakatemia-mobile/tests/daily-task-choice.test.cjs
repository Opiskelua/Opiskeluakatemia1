const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src/lib', file);
  const mod = new Module(filename, module);
  mod.require = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected import: ${id}`);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const { choices } = load('catalogue.ts');
const { taskChoice } = load('daily-task-choice.ts', { './catalogue': { choices } });
const task = (taskType, exerciseId, taskSubtype = 'mixed', difficulty = 'intermediate') => ({ taskType, exerciseId, taskSubtype, difficulty });

test('generated grammar daily tasks open the matching catalogue exercise', () => {
  for (const choice of choices.filter(c => c.category === 'grammar' && !c.path)) {
    assert.equal(taskChoice(task('grammar', choice.id, choice.type)), choice);
  }
  assert.equal(taskChoice(task('grammar', 'grammar-articles')).id, 'grammar-articles');
});

test('generated reading daily tasks resolve at every supported difficulty', () => {
  for (const difficulty of ['beginner', 'intermediate', 'advanced']) {
    for (const type of ['mc-open', 'gap-fill']) {
      assert.equal(taskChoice(task('reading', `reading-${type}-${difficulty}`, type, difficulty)).id, `reading-${type}`);
    }
  }
  assert.equal(taskChoice(task('reading', 'reading-mc-open-intermediate', 'comprehension')).id, 'reading-mc-open');
});

test('ready-made tasks retain the assigned exercise and full question set', () => {
  for (const choice of choices.filter(c => c.path && !c.multipleChoiceOnly)) {
    const id = choice.path.split('/').at(-1).replace('.json', '');
    assert.equal(taskChoice(task(choice.category, id, choice.type)), choice);
  }
});

test('legacy subtype-only tasks resolve while unknown assignments remain unsupported', () => {
  assert.equal(taskChoice(task('grammar', undefined, 'articles')).id, 'grammar-articles');
  assert.equal(taskChoice(task('grammar', 'unknown', 'articles')), undefined);
  assert.equal(taskChoice(task('reading', 'grammar-articles', 'mc-open')), undefined);
  assert.equal(taskChoice(task('essay', 'essay-focused', 'practice')), undefined);
  assert.equal(taskChoice(task('reading', 'reading-mc-open-advanced', 'mc-open')), undefined);
});
