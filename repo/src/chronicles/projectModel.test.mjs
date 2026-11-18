import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// These modules are browser independent. Resolve their local TypeScript imports
// recursively rather than requiring a browser, bundler, network or new packages.
const modules = new Map();
async function moduleUrl(filename) {
  const path = resolve(filename);
  if (modules.has(path)) return modules.get(path);
  const pending = (async () => {
    const source = await readFile(path, 'utf8');
    let { outputText } = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    } });
    const imports = [...outputText.matchAll(/\bfrom\s*(['"])(\.[^'"]+)\1/g)];
    for (const match of imports) {
      let dependency = resolve(dirname(path), match[2]);
      if (!extname(dependency)) dependency += '.ts';
      const url = await moduleUrl(dependency);
      outputText = outputText.replace(match[0], `from ${JSON.stringify(url)}`);
    }
    outputText += `\n//# sourceURL=${path.replaceAll('\\', '/')}\n`;
    return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  })();
  modules.set(path, pending);
  return pending;
}
const here = dirname(fileURLToPath(import.meta.url));
const markdownModule = await import(await moduleUrl(resolve(here, 'markdown.ts')));
const timelineModule = await import(await moduleUrl(resolve(here, 'timeline.ts')));
const gamesModule = await import(await moduleUrl(resolve(here, 'gameRound.ts')));
const { parseProject, serializeProject } = markdownModule;
const { utteranceRanges, resolveTime, clipRange, sceneDuration, activeClips, spokenCaption, validateProject } = timelineModule;
const { GameRound, reactionCandidates, normalizeAnswer } = gamesModule;

const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  return {
    schemaVersion: 1, id: 'chronicles-test', title: 'Хроники: тест',
    tracks: [
      { id: 'V1', label: 'Кадр', kind: 'frame', order: 1 },
      { id: 'V2', label: 'Скриншот', kind: 'image', order: 2 },
      { id: 'A1', label: 'Голос', kind: 'voice', order: 3 },
    ],
    assets: [
      { id: 'image', kind: 'image', key: 'portrait' },
      { id: 'audio-1', kind: 'audio', path: 'media/voice-1.mp3', duration: 10 },
      { id: 'audio-2', kind: 'audio', path: 'media/voice-2.mp3', duration: 1 },
    ],
    utterances: [
      { id: 'u1', text: 'Первое слово. Финал.', audioAssetId: 'audio-1', duration: 10, words: [
        { text: 'Первое', start: 0, end: 1 }, { text: 'слово.', start: 2, end: 3 }, { text: 'Финал.', start: 8, end: 9 },
      ] },
      { id: 'u2', text: 'Точная цитата: «не менять».', audioAssetId: 'audio-2', duration: 1,
        words: [{ text: 'Точная', start: .1, end: .8 }] },
    ],
    scenes: [{ id: 'ROOM-I', title: 'Общий поток', kind: 'room', utteranceIds: ['u1', 'u2'], duration: 15 }],
    clips: [
      { id: 'voice-1', sceneId: 'ROOM-I', trackId: 'A1', kind: 'voice', utteranceId: 'u1', assetId: 'audio-1', start: { type: 'scene', offset: 2 }, duration: 10 },
      { id: 'voice-2', sceneId: 'ROOM-I', trackId: 'A1', kind: 'voice', utteranceId: 'u2', assetId: 'audio-2', start: { type: 'scene', offset: 14 }, duration: 1 },
      { id: 'portrait', sceneId: 'ROOM-I', trackId: 'V1', kind: 'frame', assetId: 'image', start: { type: 'scene', offset: 0 }, duration: 15 },
      { id: 'slack', sceneId: 'ROOM-I', trackId: 'V2', kind: 'image', assetId: 'image', start: { type: 'word', utteranceId: 'u1', wordIndex: 1, edge: 'start', offset: 0 }, end: { type: 'word', utteranceId: 'u1', wordIndex: 2, edge: 'end', offset: 0 } },
    ], stops: [], sequence: [{ kind: 'scene', sceneId: 'ROOM-I' }],
  };
}

function configOf(project) {
  return { ...project, utterances: project.utterances.map(({ text: _text, ...metadata }) => metadata) };
}
function sourceDocument(project = fixture()) {
  return '# Авторский проект\n\n<!-- Сохранить заметку дословно: $& и кавычки -->\n\n'
    + project.utterances.map(u => `[ГОЛОС ЛОРДА ${u.id}]\n${u.text}\n[КОНЕЦ РЕПЛИКИ]\n`).join('\n')
    + '\nНеозвучиваемая заметка: **сохранить форматирование**.\n\n```chronicles-config\n'
    + JSON.stringify(configOf(project), null, 2) + '\n```\n\nХвост документа.\n';
}
const CONFIG = /^```chronicles-config\s*\n([\s\S]*?)^```[ \t]*$/gm;
function documentConfig(markdown) { return JSON.parse([...markdown.matchAll(CONFIG)][0][1]); }
function withoutConfig(markdown) { return markdown.replace(CONFIG, '<CONFIG>'); }

test('Markdown and config form one model without duplicating spoken text', () => {
  const source = sourceDocument();
  const { project } = parseProject(source);
  assert.equal(project.utterances[1].text, 'Точная цитата: «не менять».');
  const output = serializeProject(project, source);
  assert.equal(withoutConfig(output), withoutConfig(source));
  assert.deepEqual(parseProject(output).project, project);
  assert.ok(documentConfig(output).utterances.every(u => !Object.hasOwn(u, 'text')));
  assert.equal(output.split('Точная цитата: «не менять».').length - 1, 1);
});

test('a save without edits preserves the complete author file after LF normalization', () => {
  const source = sourceDocument();
  assert.equal(serializeProject(parseProject(source).project, source), source);
});

test('editing one voice body preserves other speech, notes and literal replacement characters', () => {
  const source = sourceDocument(), project = parseProject(source).project;
  project.utterances[0].text = 'Новая строка с $& и «цитатой».\nПродолжение.';
  const output = serializeProject(project, source);
  assert.equal(parseProject(output).project.utterances[0].text, project.utterances[0].text);
  assert.ok(output.includes('<!-- Сохранить заметку дословно: $& и кавычки -->'));
  assert.ok(output.includes('[ГОЛОС ЛОРДА u2]\nТочная цитата: «не менять».\n[КОНЕЦ РЕПЛИКИ]'));
  assert.ok(output.endsWith('Хвост документа.\n'));
});

test('config remains data even when captions contain JavaScript or voice-like markers', () => {
  const project = fixture();
  project.clips[2].text = '[ГОЛОС ЛОРДА FAKE]\nnever speak this\n[КОНЕЦ РЕПЛИКИ]\nglobalThis.__chroniclesProbe = true';
  globalThis.__chroniclesProbe = false;
  const source = sourceDocument(project), parsed = parseProject(source).project;
  assert.equal(parsed.utterances.length, 2);
  assert.equal(parsed.clips[2].text, project.clips[2].text);
  assert.equal(globalThis.__chroniclesProbe, false);
  assert.equal(documentConfig(serializeProject(parsed, source)).clips[2].text, project.clips[2].text);
  delete globalThis.__chroniclesProbe;
});

test('duplicate or missing authored voice IDs are rejected', () => {
  const source = sourceDocument();
  assert.throws(() => parseProject(source + '\n[ГОЛОС ЛОРДА u1]\nДубль.\n[КОНЕЦ РЕПЛИКИ]\n'), /Повтор ID/);
  assert.throws(() => parseProject(source.replace('[ГОЛОС ЛОРДА u1]', '[ГОЛОС ЛОРДА other]')), /Не найден|не включена/);
  assert.throws(() => parseProject(source + '\n[ГОЛОС ЛОРДА unused]\nЛишняя речь.\n[КОНЕЦ РЕПЛИКИ]\n'), /не включена/);
});

test('duplicate utterance metadata is an error, not two copies of the same voice', () => {
  const project = fixture();
  project.utterances.push(clone(project.utterances[0]));
  assert.ok(validateProject(project).some(d => d.severity === 'error' && d.code === 'duplicate_id'));
});

test('a changed format and malformed config do not silently import', () => {
  const source = sourceDocument();
  for (const invalid of [source.replace('"schemaVersion": 1', '"schemaVersion": 99'),
    source.replace('"tracks": [', '"tracks": null, "discarded": ['),
    source.replace('"schemaVersion": 1', '"schemaVersion": NOT_JSON'),
    source.replace('```chronicles-config', '```json'),
    source + '\n```chronicles-config\n{}\n```\n']) {
    assert.throws(() => parseProject(invalid));
  }
});

test('the voice list cannot be implicitly added to or removed by serialization', () => {
  const source = sourceDocument();
  const removed = parseProject(source).project;
  removed.utterances.pop();
  assert.throws(() => serializeProject(removed, source), /Удаление речевого блока/);
  const added = parseProject(source).project;
  added.utterances.push({ id: 'new', text: 'Новая речь.' });
  assert.throws(() => serializeProject(added, source), /Новый речевой блок/);
});

test('scene, utterance and word references resolve against the same actual voice positions', () => {
  const project = fixture();
  assert.deepEqual(utteranceRanges(project, 'ROOM-I'), [{ id: 'u1', start: 2, end: 12 }, { id: 'u2', start: 14, end: 15 }]);
  assert.equal(resolveTime(project, 'ROOM-I', { type: 'scene', offset: 3 }), 3);
  assert.equal(resolveTime(project, 'ROOM-I', { type: 'utterance', utteranceId: 'u1', edge: 'end', offset: .25 }), 12.25);
  assert.equal(resolveTime(project, 'ROOM-I', { type: 'word', utteranceId: 'u1', wordIndex: 1, edge: 'start', offset: .5 }), 4.5);
  assert.deepEqual(clipRange(project, project.clips[3]), { start: 4, end: 11 });
});

test('unknown word anchors remain unresolved instead of acquiring approximate seconds', () => {
  const project = fixture();
  for (const ref of [
    { type: 'word', utteranceId: 'u1', wordIndex: 100, offset: 0 },
    { type: 'word', utteranceId: 'missing', wordIndex: 0, offset: 0 },
    { type: 'utterance', utteranceId: 'missing', offset: 0 },
    { type: 'scene', offset: NaN },
  ]) assert.equal(resolveTime(project, 'ROOM-I', ref), null);
  project.utterances[0].words = [];
  assert.equal(resolveTime(project, 'ROOM-I', { type: 'word', utteranceId: 'u1', wordIndex: 0, offset: 0 }), null);
});

test('source trimming gives clips and utterance anchors the same shortened interval', () => {
  const project = fixture();
  Object.assign(project.clips[0], { sourceIn: 2, sourceOut: 6 });
  delete project.clips[0].duration;
  assert.deepEqual(utteranceRanges(project, 'ROOM-I')[0], { id: 'u1', start: 2, end: 6 });
  assert.deepEqual(clipRange(project, project.clips[0]), { start: 2, end: 6 });
});

test('scene duration includes an enabled overlay whose end is anchored relative to speech', () => {
  const project = fixture();
  project.clips.push({ id: 'extended', kind: 'image', sceneId: 'ROOM-I', trackId: 'V2', assetId: 'image',
    start: { type: 'utterance', utteranceId: 'u1', edge: 'end', offset: 0 }, duration: 8 });
  assert.equal(sceneDuration(project, 'ROOM-I'), 20);
});

test('disabled clips do not extend the duration of a scene', () => {
  const project = fixture();
  project.clips.push({ id: 'disabled', kind: 'image', sceneId: 'ROOM-I', trackId: 'V2', assetId: 'image',
    start: { type: 'scene', offset: 30 }, duration: 20, enabled: false });
  assert.equal(sceneDuration(project, 'ROOM-I'), 15);
});

test('source trims also shorten audio clips when the old duration metadata remains', () => {
  const project = fixture();
  Object.assign(project.clips[0], { sourceIn: 2, sourceOut: 6 });
  assert.deepEqual(utteranceRanges(project, 'ROOM-I')[0], { id: 'u1', start: 2, end: 6 });
  assert.deepEqual(clipRange(project, project.clips[0]), { start: 2, end: 6 });
});

test('a looping bed retains its authored timeline length instead of its short source length', () => {
  const project = fixture();
  project.assets.push({ id: 'loop', kind: 'audio', duration: 2 });
  const clip = { id: 'bed', kind: 'audio', sceneId: 'ROOM-I', trackId: 'A1', assetId: 'loop',
    start: { type: 'utterance', utteranceId: 'u1', edge: 'end', offset: 0 },
    sourceIn: .5, sourceOut: 1.5, duration: 30, loop: true };
  project.clips.push(clip);
  assert.deepEqual(clipRange(project, clip), { start: 12, end: 42 });
  assert.equal(sceneDuration(project, 'ROOM-I'), 42);
});

test('disabled voice clips do not reappear as fallback speech intervals', () => {
  const project = fixture();
  project.scenes[0].duration = 0;
  project.scenes[0].utteranceIds = ['u1'];
  project.clips = [{ ...project.clips[0], start: { type: 'scene', offset: 30 }, enabled: false }];
  assert.deepEqual(utteranceRanges(project, 'ROOM-I'), [{ id: 'u1', start: 0, end: 0 }]);
  assert.equal(sceneDuration(project, 'ROOM-I'), 0);
});

test('there is no first, previous or last voice in a clean entrance or subtitle gap', () => {
  const project = fixture();
  for (const time of [0, 1.999, 12, 12.5, 13.999, 15, 50]) {
    assert.equal(activeClips(project, 'ROOM-I', time).filter(c => c.kind === 'voice').length, 0, `time ${time}`);
  }
  assert.deepEqual(activeClips(project, 'ROOM-I', 14).filter(c => c.kind === 'voice').map(c => c.id), ['voice-2']);
});

test('captions hold a stable phrase through word gaps and clear outside the utterance', () => {
  const utterance = fixture().utterances[0];
  assert.equal(spokenCaption(utterance, .5), 'Первое слово.');
  for (const time of [1,1.5,3,7]) assert.equal(spokenCaption(utterance,time),'Первое слово.',`time ${time}`);
  for (const time of [8,9,9.9]) assert.equal(spokenCaption(utterance,time),'Финал.',`time ${time}`);
  for (const time of [-1,10,100]) assert.equal(spokenCaption(utterance,time),'',`time ${time}`);
  assert.equal(spokenCaption({ ...utterance, subtitleText: 'Явная экранная версия.' }, .5), 'Явная экранная версия.');
});

test('hidden visual tracks and muted audio tracks are independently inactive', () => {
  const project = fixture();
  project.tracks.find(t => t.id === 'V2').hidden = true;
  project.tracks.find(t => t.id === 'A1').muted = true;
  assert.deepEqual(activeClips(project, 'ROOM-I', 5).map(c => c.id), ['portrait']);
});

test('game events select a branch while the same event label does not hide normal room footage', () => {
  const project = fixture();
  project.clips[2].event = 'correct';
  assert.ok(activeClips(project, 'ROOM-I', 5, 'wrong').some(c => c.id === 'portrait'));
  project.scenes[0].kind = 'game';
  assert.ok(!activeClips(project, 'ROOM-I', 5, 'wrong').some(c => c.id === 'portrait'));
  assert.ok(activeClips(project, 'ROOM-I', 5, 'correct').some(c => c.id === 'portrait'));
});

test('room SFX retain their time interval even when their source cue carries an event label', () => {
  const project = fixture();
  project.clips.push({ id: 'room-sfx', sceneId: 'ROOM-I', trackId: 'A1', kind: 'sfx', assetId: 'audio-2',
    event: 'ROOM-I.CUE', start: { type: 'scene', offset: 4 }, duration: 1 });
  assert.ok(activeClips(project, 'ROOM-I', 4.5).some(c => c.id === 'room-sfx'));
  project.scenes[0].kind = 'game';
  assert.ok(!activeClips(project, 'ROOM-I', 4.5).some(c => c.id === 'room-sfx'));
  assert.ok(activeClips(project, 'ROOM-I', 4.5, 'ROOM-I.CUE').some(c => c.id === 'room-sfx'));
});

test('missing owners/assets and invalid clip ranges are diagnosed', () => {
  const project = fixture();
  project.clips.push({ id: 'broken', sceneId: 'missing', trackId: 'missing', kind: 'image', assetId: 'missing',
    start: { type: 'scene', offset: 5 }, end: { type: 'scene', offset: 3 } });
  const codes = validateProject(project).filter(d => d.severity === 'error').map(d => d.code);
  for (const code of ['missing_owner', 'missing_asset', 'invalid_range']) assert.ok(codes.includes(code));
});

function choiceGame(patch = {}) {
  return { id: 'I-04', kind: 'choice', question: 'Вопрос', maxWrong: 3, introIds: [],
    options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }, { id: 'C', text: 'C', correct: true }, { id: 'D', text: 'D' }],
    reactions: { correct: ['I-04.ВЕРНО'], 'wrong.A': ['I-04.ОШИБКА.A'], 'wrong.B': ['I-04.ОШИБКА.B'],
      'wrong.D': ['I-04.ОШИБКА.D'], exhausted: ['COMMON.ЛИМИТ'], first_choice: ['I-02.ПЕРВЫЙ_ВЫБОР'] }, ...patch };
}
function wordGame(patch = {}) {
  return { id: 'I-01', kind: 'word', question: 'Восстановите слово', answer: 'демоблил', maxWrong: 3,
    introIds: [], reactions: { letter_correct: ['I-01.БУКВА.ВЕРНО'], letter_misplaced: ['I-01.БУКВА.ДРУГОЕ_МЕСТО.1'],
      repeat: ['I-01.ПОВТОР.1'], exhausted: ['COMMON.ЛИМИТ'] }, ...patch };
}

test('Househunt accepts any first choice and never spends mistakes or invokes COMMON', () => {
  for (const option of ['A', 'B', 'C', 'D']) {
    const game = choiceGame({ id: 'I-02', revealAll: true, maxWrong: null }), round = new GameRound(game);
    const result = round.submit(option.toLowerCase());
    assert.deepEqual(result, { event: 'reveal_all', final: true, optionId: option });
    assert.equal(round.wrong, 0);
    assert.equal(round.finished, true);
    assert.deepEqual(reactionCandidates(game, result), ['I-02.ПЕРВЫЙ_ВЫБОР']);
    assert.equal(round.submit('A').event, 'repeat');
    assert.equal(round.wrong, 0);
  }
});

test('an empty or invalid choice does not finish Househunt', () => {
  const round = new GameRound(choiceGame({ id: 'I-02', revealAll: true, maxWrong: null }));
  assert.deepEqual(round.submit('  '), { event: 'empty', final: false });
  assert.deepEqual(round.submit('E'), { event: 'invalid', final: false });
  assert.equal(round.finished, false);
  assert.equal(round.wrong, 0);
});

const freeGame = () => ({ id: 'I-03', kind: 'free', question: 'Один ответ', answer: 'глаза',
  acceptedAnswers: ['глазами', 'свои глаза', 'своими глазами', 'зрение', 'собственное зрение'],
  maxWrong: 1, introIds: [], reactions: { correct: ['I-03.ВЕРНО'], wrong: ['I-03.НЕВЕРНО'] } });

test('CHGK accepts its agreed forms and only one substantive response', () => {
  for (const accepted of [' ГЛАЗА. ', 'Глазами!', 'свои глаза', 'своими глазами', 'зрение', 'собственное зрение']) {
    const game = freeGame(), round = new GameRound(game), result = round.submit(accepted);
    assert.deepEqual(result, { event: 'correct', final: true });
    assert.deepEqual(reactionCandidates(game, result), ['I-03.ВЕРНО']);
    assert.deepEqual(round.submit('другой ответ'), { event: 'repeat', final: true });
  }
  const game = freeGame(), round = new GameRound(game), wrong = round.submit('лупа');
  assert.deepEqual(wrong, { event: 'wrong', final: true });
  assert.deepEqual(reactionCandidates(game, wrong), ['I-03.НЕВЕРНО']);
  assert.ok(!reactionCandidates(game, wrong).includes('COMMON.ЛИМИТ'));
});

test('empty and non-content input do not finalize CHGK', () => {
  const round = new GameRound(freeGame());
  for (const input of ['', '   ', '…', '!?', '🙂']) {
    const result = round.submit(input);
    assert.equal(result.final, false);
    assert.ok(['empty', 'invalid'].includes(result.event));
    assert.equal(round.finished, false);
  }
  assert.deepEqual(round.submit('глаза'), { event: 'correct', final: true });
});

test('three distinct wrong choices invoke only the shared final on the third one', () => {
  const game = choiceGame(), round = new GameRound(game);
  assert.equal(round.submit('A').event, 'wrong');
  assert.deepEqual(round.submit('A'), { event: 'repeat', final: false, optionId: 'A' });
  assert.equal(round.wrong, 1);
  assert.equal(round.submit('B').event, 'wrong');
  const result = round.submit('D');
  assert.deepEqual(result, { event: 'exhausted', final: true, optionId: 'D' });
  assert.equal(round.wrong, 3);
  assert.deepEqual(reactionCandidates(game, result), ['COMMON.ЛИМИТ']);
});

test('a correct ordinary choice finishes before the limit', () => {
  const round = new GameRound(choiceGame());
  round.submit('A');
  assert.deepEqual(round.submit('C'), { event: 'correct', final: true, optionId: 'C' });
  assert.equal(round.wrong, 1);
});

test('word input distinguishes a correct position, automatic relocation and repeated letters', () => {
  const round = new GameRound(wordGame());
  round.draft.startAt(0); round.draft.update('Д');
  assert.deepEqual(round.submit(round.draft.submission(round.letters.cells).value), { event: 'letter_correct', final: false });
  assert.equal(round.letters.cells[0], 'Д');
  round.draft.startAt(3); round.draft.update('Е');
  assert.deepEqual(round.submit(round.draft.submission(round.letters.cells).value), { event: 'letter_misplaced', final: false });
  assert.equal(round.letters.cells[1], 'Е');
  round.draft.startAt(1); round.draft.update('Е');
  assert.deepEqual(round.submit(round.draft.submission(round.letters.cells).value), { event: 'repeat', final: false });
  assert.equal(round.wrong, 0);
});

test('word draft editing starts in the selected cell and completes around known letters', () => {
  const round = new GameRound(wordGame());
  round.draft.startAt(0); round.draft.update('Д'); round.submit(round.draft.submission(round.letters.cells).value);
  round.draft.startAt(1); round.draft.update('ЕМОБЛИЛ');
  const submission = round.draft.submission(round.letters.cells);
  assert.equal(submission.value, 'ДЕМОБЛИЛ');
  assert.equal(submission.incomplete, false);
  assert.deepEqual(round.submit(submission.value), { event: 'correct', final: true });
});

test('empty, invalid, incomplete and oversized word input do not consume mistakes', () => {
  const round = new GameRound(wordGame());
  for (const [input, expected] of [['', 'empty'], ['A', 'invalid'], ['abc', 'invalid_word'], ['ДЕ', 'incomplete'], ['ДЕМОБЛИЛЛ', 'too_long']]) {
    round.draft.clear(); round.draft.update(input);
    assert.deepEqual(round.submit(input), { event: expected, final: false });
    assert.equal(round.wrong, 0);
    assert.equal(round.finished, false);
  }
});

test('word mistakes reach COMMON exactly once and repeated wrong letters are free', () => {
  const game = wordGame(), round = new GameRound(game);
  assert.equal(round.submit('Я').event, 'letter_wrong');
  assert.equal(round.submit('Я').event, 'repeat');
  assert.equal(round.wrong, 1);
  assert.equal(round.submit('Ю').event, 'letter_wrong');
  const final = round.submit('Ж');
  assert.deepEqual(final, { event: 'exhausted', final: true });
  assert.deepEqual(reactionCandidates(game, final), ['COMMON.ЛИМИТ']);
  assert.equal(round.submit('Ф').event, 'repeat');
  assert.equal(round.wrong, 3);
});

test('answer normalization preserves meaningful words and tolerates agreed typography', () => {
  assert.equal(normalizeAnswer('  Своими глазами!.. '), 'своими глазами');
  assert.equal(normalizeAnswer('ЁЖ'), 'еж');
});

const defaultMarkdown = await readFile(resolve(here, 'default-project.md'), 'utf8');
const defaultProject = parseProject(defaultMarkdown).project;

test('the actual completed project has no missing voice, alignment or unresolved anchors', () => {
  const diagnostics = validateProject(defaultProject);
  assert.deepEqual(diagnostics, []);
  assert.equal(defaultProject.utterances.length, 242);
  for (const u of defaultProject.utterances) {
    assert.ok(u.duration > 0 && u.audioAssetId, u.id);
    assert.deepEqual(u.words.map(w => w.text), u.text.trim().split(/\s+/), u.id);
  }
});

test('music with an authored end and no fixed duration plays to its end or physical out-point', () => {
  const project=fixture();
  const clip={id:'music',sceneId:'ROOM-I',trackId:'A1',kind:'audio',assetId:'audio-1',start:{type:'scene',offset:1},end:{type:'scene',offset:7},duration:0};
  project.clips.push(clip);
  assert.deepEqual(clipRange(project,clip),{start:1,end:7});
  assert.ok(activeClips(project,'ROOM-I',3).some(c=>c.id==='music'));
  clip.sourceIn=8;
  assert.deepEqual(clipRange(project,clip),{start:1,end:3});
});

test('the actual project contains exactly the five agreed stops in route order', () => {
  assert.equal(defaultProject.stops.length, 5);
  const ids = defaultProject.sequence.filter(n => n.kind === 'stop').map(n => defaultProject.stops.find(s => s.id === n.stopId)?.game.id);
  assert.deepEqual(ids, ['I-04', 'I-01', 'I-03', 'I-02', 'I-05']);
  assert.equal(new Set(defaultProject.stops.map(s => s.roomSceneId)).size, 5);
  const househunt = defaultProject.stops.find(s => s.game.id === 'I-02').game;
  const chgk = defaultProject.stops.find(s => s.game.id === 'I-03').game;
  for (const option of househunt.options) assert.equal(new GameRound(househunt).submit(option.id).event, 'reveal_all');
  assert.equal(new GameRound(chgk).submit('лупа').event, 'wrong');
  assert.equal(new GameRound(chgk).submit('своими глазами').event, 'correct');
});

test('the actual project reopens from its Markdown with every voice body intact', () => {
  const output = serializeProject(defaultProject, defaultMarkdown);
  const reparsed = parseProject(output).project;
  assert.deepEqual(reparsed, defaultProject);
  assert.deepEqual(reparsed.utterances.map(u => [u.id, u.text]), defaultProject.utterances.map(u => [u.id, u.text]));
  assert.ok(documentConfig(output).utterances.every(u => !Object.hasOwn(u, 'text')));
});

const {viewerShortcut}=await import(await moduleUrl(resolve(here,'viewerShortcuts.ts')));
const {captionPhrases}=timelineModule;
const {opticalWipe}=await import(await moduleUrl(resolve(here,'MoviePicture.ts')));
test('restores original viewer shortcuts including physical Russian layout keys',()=>{
  for(const [key,code,expected] of [
    [' ','Space',{kind:'toggle'}],['K','KeyK',{kind:'toggle'}],['л','KeyK',{kind:'toggle'}],
    ['j','KeyJ',{kind:'seek',seconds:-10}],['L','KeyL',{kind:'seek',seconds:10}],
    ['ArrowLeft','ArrowLeft',{kind:'seek',seconds:-5}],['ArrowRight','ArrowRight',{kind:'seek',seconds:5}],
    ['PageUp','PageUp',{kind:'chapter',direction:-1}],['PageDown','PageDown',{kind:'chapter',direction:1}],
    ['m','KeyM',{kind:'mute'}],['f','KeyF',{kind:'fullscreen'}],['c','KeyC',{kind:'captions'}],
    ['в','KeyD',{kind:'director'}],['t','KeyT',{kind:'introTrack'}],['p','KeyP',{kind:'introTitle'}]
  ])assert.deepEqual(viewerShortcut({key,code}),expected,`${key} / ${code}`);
  for(let i=0;i<=9;i++)assert.deepEqual(viewerShortcut({key:String(i)}),{kind:'percent',ratio:i/10});
});
test('shift arrows change chapters before the ordinary five-second seek',()=>{
  for(const [key,direction] of [['ArrowLeft',-1],['ArrowRight',1]])assert.deepEqual(viewerShortcut({key,shiftKey:true}),{kind:'chapter',direction});
});
test('director audio keys retain cue type and bracket direction',()=>{
  for(const [key,code,category] of [['t','KeyT','dread'],['е','KeyT','dread'],['p','KeyP','peace'],['з','KeyP','peace'],['x','KeyX','stop'],['ч','KeyX','stop']])assert.deepEqual(viewerShortcut({key,code},true),{kind:'cue',category});
  for(const [key,code,seconds] of [['[','BracketLeft',-1],['х','BracketLeft',-1],[']','BracketRight',1],['ъ','BracketRight',1]])assert.deepEqual(viewerShortcut({key,code},true),{kind:'nudge',seconds});
});
test('visible choice owns A–D while editing shortcuts keep modifier combinations',()=>{
  for(const option of ['a','b','c','d'])assert.deepEqual(viewerShortcut({key:option},false,true),{kind:'answer',option:option.toUpperCase()});
  assert.deepEqual(viewerShortcut({key:'d'},true,false),{kind:'director'});
  for(const modifier of ['ctrlKey','metaKey','altKey'])for(const key of ['d','s','c','v','z','j','ArrowRight'])assert.equal(viewerShortcut({key,[modifier]:true},true),undefined);
});
test('phrase navigation matches stable captions through silence and honors replacement text',()=>{
  const u=fixture().utterances[0];assert.deepEqual(captionPhrases(u),[{start:0,text:'Первое слово.'},{start:8,text:'Финал.'}]);
  assert.equal(spokenCaption(u,7.9),'Первое слово.');assert.equal(spokenCaption(u,8),'Финал.');
  const previous=captionPhrases(u);u.words=[{text:'Новая.',start:1,end:2}];assert.notEqual(captionPhrases(u),previous);assert.equal(spokenCaption(u,1),'Новая.');
  u.subtitleText='Экранная версия';assert.deepEqual(captionPhrases(u),[{start:0,text:'Экранная версия'}]);
});
test('optical wipes reveal only the incoming frame and reach every corner',()=>{
  assert.equal(opticalWipe('line_lr',0,1280,720),'inset(0 100% 0 0)');assert.equal(opticalWipe('line_rl',1,1280,720),'inset(0 0 0 0%)');
  assert.equal(opticalWipe('line_tb',.5,1280,720),'inset(0 0 50% 0)');
  for(const type of ['circle_iris','circle_iris_corner']){const mask=opticalWipe(type,1,1280,720),radius=Number(mask.match(/circle\(([^p]+)/)[1]);assert.ok(radius>=Math.hypot(640,360));}
});

test('native logo/verdict/reward stickers retain distinct speech anchors after ripple edits',()=>{
  const p=parseProject(defaultMarkdown).project;
  const before=timelineModule.navigationRanges(p),opening=before.find(c=>c.sticker==='logo'),reward=before.find(c=>c.sticker==='reward'),verdict=before.find(c=>c.sticker==='punishment');
  assert.equal(opening.sceneId,'OPENING');assert.equal(opening.time,0);assert.equal(reward.at.utteranceId,'VERDICT.P012');assert.equal(verdict.end,reward.time);assert.ok(reward.time>verdict.time);
  const next=clone(p),voice=next.clips.find(c=>c.kind==='voice'&&c.utteranceId==='VERDICT.P012');voice.start.offset+=2;
  assert.equal(timelineModule.navigationRanges(next).find(c=>c.sticker==='reward').time,reward.time+2);
  next.navigation.find(c=>c.sticker==='reward').sceneId='INTRO';assert.ok(validateProject(next).some(d=>d.code==='invalid_navigation'));
});
