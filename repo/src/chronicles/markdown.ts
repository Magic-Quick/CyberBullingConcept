import type { Project } from './model';

const CONFIG = /^```chronicles-config\s*\n([\s\S]*?)^```[ \t]*$/gm;
const VOICE = /^\[ГОЛОС ЛОРДА ([^\]\r\n]+)\][ \t]*\n([\s\S]*?)^\[КОНЕЦ РЕПЛИКИ\][ \t]*$/gm;
export interface ProjectDocument { project: Project; markdown: string; }

export function parseProject(markdown: string): ProjectDocument {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const configs = [...normalized.matchAll(CONFIG)];
  if (configs.length !== 1) throw new Error('В проекте должна быть одна секция chronicles-config.');
  let config: Project;
  try { config = JSON.parse(configs[0][1]); } catch { throw new Error('Конфиг монтажа содержит ошибку JSON.'); }
  if (config.schemaVersion !== 1) throw new Error('Эта версия формата проекта не поддерживается.');
  for (const field of ['tracks', 'assets', 'utterances', 'scenes', 'clips', 'stops', 'sequence'] as const) {
    if (!Array.isArray(config[field])) throw new Error(`В конфиге отсутствует массив ${field}.`);
  }
  if (typeof config.id !== 'string' || typeof config.title !== 'string') throw new Error('Не заданы ID и название проекта.');
  const bodies = new Map<string, string>();
  // The config is not an input to voice parsing, even if a screen caption quotes a marker.
  const source = normalized.slice(0, configs[0].index) + normalized.slice(configs[0].index! + configs[0][0].length);
  for (const match of source.matchAll(VOICE)) {
    if (bodies.has(match[1])) throw new Error(`Повтор ID реплики: ${match[1]}`);
    bodies.set(match[1], match[2].trim());
  }
  config.utterances = config.utterances.map(u => {
    if (!bodies.has(u.id)) throw new Error(`Не найден произносимый блок ${u.id}.`);
    return { ...u, text: bodies.get(u.id)! };
  });
  const ids = new Set(config.utterances.map(u => u.id));
  for (const id of bodies.keys()) if (!ids.has(id)) throw new Error(`Реплика ${id} не включена в конфиг.`);
  return { project: config, markdown: normalized };
}

export function serializeProject(project: Project, originalMarkdown: string): string {
  // Preserve authored notes, layout and all untouched prose; patch only changed voice bodies and config.
  const original = originalMarkdown.replace(/\r\n?/g, '\n');
  const old = parseProject(original).project;
  const oldBodies = new Map(old.utterances.map(u => [u.id, u.text]));
  const nextBodies = new Map(project.utterances.map(u => [u.id, u.text]));
  for (const id of oldBodies.keys()) if (!nextBodies.has(id)) throw new Error(`Удаление речевого блока ${id} требует явного импорта проекта.`);
  for (const id of nextBodies.keys()) if (!oldBodies.has(id)) throw new Error(`Новый речевой блок ${id} нужно добавить через импорт проекта.`);
  let source = original.replace(VOICE, (whole, id: string) => {
    const next = nextBodies.get(id)!;
    return next === oldBodies.get(id) ? whole : `[ГОЛОС ЛОРДА ${id}]\n${next.trim()}\n[КОНЕЦ РЕПЛИКИ]`;
  });
  const config = { ...project, utterances: project.utterances.map(({ text: _text, ...metadata }) => metadata) };
  source = source.replace(CONFIG, () => '```chronicles-config\n' + JSON.stringify(config, null, 2) + '\n```');
  return source;
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
