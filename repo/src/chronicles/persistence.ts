/** Real project storage. Browser recovery data is deliberately not a save target. */
const MAX_BYTES = 2 * 1024 * 1024;
const API = '/api/chronicles/project';

interface ProjectFile {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }>;
}
interface PickerWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<ProjectFile[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<ProjectFile>;
}
interface ApiError { error?: { code?: string; message?: string } }
interface LoadedProject { markdown: string; version: string; path?: string; }

export class ProjectStorageError extends Error {
  constructor(message: string, public readonly code = 'storage_error', public readonly status?: number) {
    super(message);
    this.name = 'ProjectStorageError';
  }
}

async function versionOf(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function checkSize(text: string): void {
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
    throw new ProjectStorageError('Размер проекта превышает 2 МиБ.', 'project_too_large');
  }
}

function cancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export class ProjectStorage {
  private file: ProjectFile | null = null;
  private fileVersion: string | null = null;
  private apiVersion: string | null = null;
  private apiAvailable: boolean | null = null;

  /** False means use Open/Export; a download must not be labelled "saved". */
  get canSaveToFile(): boolean {
    return this.apiAvailable === true || this.file !== null || typeof (window as PickerWindow).showSaveFilePicker === 'function';
  }

  private localApi(): boolean {
    return location.protocol === 'http:' && (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  }

  private async apiError(response: Response): Promise<never> {
    let detail: ApiError = {};
    try { detail = await response.json() as ApiError; } catch { /* Only show our bounded message. */ }
    throw new ProjectStorageError(detail.error?.message || `Локальный сервер отклонил запрос (${response.status}).`,
      detail.error?.code || 'server_error', response.status);
  }

  async load(): Promise<{ markdown: string; version: string } | null> {
    if (!this.localApi()) { this.apiAvailable = false; return null; }
    let response: Response;
    try { response = await fetch(API, { cache: 'no-store', credentials: 'same-origin' }); }
    catch { this.apiAvailable = false; return null; }
    if (response.status === 404 || response.status === 405) { this.apiAvailable = false; return null; }
    if (!response.ok) return this.apiError(response);
    let data: LoadedProject;
    try { data = await response.json() as LoadedProject; }
    catch { this.apiAvailable = false; return null; }
    if (typeof data.markdown !== 'string' || !/^[a-f0-9]{64}$/.test(data.version)) {
      this.apiAvailable = false;
      return null;
    }
    checkSize(data.markdown);
    this.apiAvailable = true;
    this.apiVersion = data.version;
    this.file = null;
    this.fileVersion = null;
    return { markdown: data.markdown, version: data.version };
  }

  async save(markdown: string, expectedVersion?: string): Promise<{ version: string; path: string }> {
    checkSize(markdown);
    if (!this.file && this.apiAvailable === true) {
      const version = expectedVersion || this.apiVersion;
      if (!version) throw new ProjectStorageError('Сначала откройте актуальную версию проекта.', 'version_required');
      let response: Response;
      try {
        response = await fetch(API, { method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdown, expectedVersion: version }) });
      } catch {
        throw new ProjectStorageError('Локальный сервер недоступен. Правки остаются в редакторе; экспортируйте файл.', 'server_unavailable');
      }
      if (!response.ok) return this.apiError(response);
      const data = await response.json() as { version?: string; path?: string };
      if (!data.version || !data.path) throw new ProjectStorageError('Сервер не подтвердил запись проекта.', 'save_not_verified');
      this.apiVersion = data.version;
      return { version: data.version, path: data.path };
    }
    const picker = window as PickerWindow;
    if (!this.file) {
      if (!picker.showSaveFilePicker) {
        throw new ProjectStorageError('Для записи в исходник запустите локальный сервер. Сейчас доступен «Экспортировать проект».', 'export_required');
      }
      try {
        this.file = await picker.showSaveFilePicker({ suggestedName: 'chronicles-project.md',
          types: [{ description: 'Текстовый проект хроник', accept: { 'text/markdown': ['.md'] } }] });
        this.fileVersion = await versionOf(await (await this.file.getFile()).text());
      } catch (error) {
        if (cancelled(error)) throw new ProjectStorageError('Выбор файла отменён. Правки не сохранены.', 'cancelled');
        throw error;
      }
    }
    const current = await (await this.file.getFile()).text();
    const currentVersion = await versionOf(current);
    if (this.fileVersion && currentVersion !== this.fileVersion) {
      throw new ProjectStorageError('Файл изменён другим редактором. Откройте актуальную версию или экспортируйте черновик.', 'version_conflict', 409);
    }
    const writable = await this.file.createWritable();
    try { await writable.write(markdown); await writable.close(); }
    catch (error) { await writable.abort?.().catch(() => {}); throw error; }
    const verified = await (await this.file.getFile()).text();
    if (verified !== markdown) throw new ProjectStorageError('Не удалось проверить сохранённый файл.', 'save_not_verified');
    this.fileVersion = await versionOf(markdown);
    return { version: this.fileVersion, path: this.file.name };
  }

  async pickAndOpen(): Promise<string | null> {
    const picker = window as PickerWindow;
    if (picker.showOpenFilePicker) {
      try {
        const files = await picker.showOpenFilePicker({ multiple: false,
          types: [{ description: 'Текстовый проект хроник', accept: { 'text/markdown': ['.md', '.txt'] } }] });
        if (!files[0]) return null;
        const text = await (await files[0].getFile()).text();
        checkSize(text);
        this.file = files[0];
        this.fileVersion = await versionOf(text);
        return text;
      } catch (error) { if (cancelled(error)) return null; throw error; }
    }
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.md,.txt'; input.hidden = true;
      input.addEventListener('cancel', () => { input.remove(); resolve(null); }, { once: true });
      input.addEventListener('change', async () => {
        try {
          const file = input.files?.[0];
          if (!file) { resolve(null); return; }
          if (file.size > MAX_BYTES) throw new ProjectStorageError('Размер проекта превышает 2 МиБ.', 'project_too_large');
          const text = await file.text();
          this.file = null;
          // A file input grants read access only. Do not silently overwrite the API's project.
          this.fileVersion = null;
          this.apiAvailable = false;
          resolve(text);
        } catch (error) { reject(error); }
        finally { input.remove(); }
      }, { once: true });
      document.body.append(input); input.click();
    });
  }

  async export(markdown: string, filename = 'chronicles-project.md'): Promise<void> {
    checkSize(markdown);
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/[\\/:*?"<>|]/g, '_');
    anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Export intentionally does not advance the saved version or clear dirty state.
  }
}
