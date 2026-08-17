export interface LocalDocumentFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<LocalDocumentWritable>;
}

interface LocalDocumentWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface LocalEditorDocument {
  id: string;
  name: string;
  content: string;
  persisted: boolean;
  handle?: LocalDocumentFileHandle;
}

export interface LocalDocumentSaveResult {
  document: LocalEditorDocument;
  method: "file" | "download";
}

export interface LocalDocumentPicker {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: FilePickerType[];
  }) => Promise<LocalDocumentFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: FilePickerType[];
  }) => Promise<LocalDocumentFileHandle>;
}

interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

const mdsFileTypes: FilePickerType[] = [
  {
    description: "MDS document",
    accept: {
      "text/plain": [".mds"]
    }
  }
];

export function createLocalDraft(existingNames: readonly string[]): LocalEditorDocument {
  return {
    id: createLocalDocumentId(),
    name: nextUntitledName(existingNames),
    content: createDraftSource(),
    persisted: false
  };
}

export function createDraftSource(): string {
  return "---\ntitle: Untitled\n---\n\n# Untitled\n\nStart writing here.\n";
}

export function nextUntitledName(existingNames: readonly string[]): string {
  const names = new Set(existingNames.map((name) => name.toLocaleLowerCase()));
  if (!names.has("untitled.mds")) {
    return "untitled.mds";
  }

  let suffix = 2;
  while (names.has(`untitled-${suffix}.mds`)) {
    suffix += 1;
  }
  return `untitled-${suffix}.mds`;
}

export async function openLocalDocument(
  pickerWindow: LocalDocumentPicker = window as unknown as LocalDocumentPicker
): Promise<LocalEditorDocument | undefined> {
  if (pickerWindow.showOpenFilePicker !== undefined) {
    try {
      const [handle] = await pickerWindow.showOpenFilePicker({
        multiple: false,
        types: mdsFileTypes
      });
      if (handle === undefined) {
        return undefined;
      }
      const file = await handle.getFile();
      return localDocumentFromFile(file, handle);
    } catch (error) {
      if (isFilePickerCancellation(error)) {
        return undefined;
      }
      throw error;
    }
  }

  const file = await chooseLocalFileWithInput();
  return file === undefined ? undefined : localDocumentFromFile(file);
}

export async function saveLocalDocument(
  document: LocalEditorDocument,
  content: string,
  pickerWindow: LocalDocumentPicker = window as unknown as LocalDocumentPicker
): Promise<LocalDocumentSaveResult | undefined> {
  let handle = document.handle;

  if (handle === undefined && pickerWindow.showSaveFilePicker !== undefined) {
    try {
      handle = await pickerWindow.showSaveFilePicker({
        suggestedName: ensureMdsExtension(document.name),
        types: mdsFileTypes
      });
    } catch (error) {
      if (isFilePickerCancellation(error)) {
        return undefined;
      }
      throw error;
    }
  }

  if (handle !== undefined) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return {
      document: {
        ...document,
        name: handle.name,
        content,
        persisted: true,
        handle
      },
      method: "file"
    };
  }

  downloadLocalDocument(ensureMdsExtension(document.name), content);
  return {
    document: {
      ...document,
      name: ensureMdsExtension(document.name),
      content,
      persisted: true
    },
    method: "download"
  };
}

export function ensureMdsExtension(name: string): string {
  return name.toLocaleLowerCase().endsWith(".mds") ? name : `${name}.mds`;
}

function localDocumentFromFile(file: File, handle?: LocalDocumentFileHandle): Promise<LocalEditorDocument> {
  return file.text().then((content) => ({
    id: createLocalDocumentId(),
    name: file.name,
    content,
    persisted: true,
    ...(handle === undefined ? {} : { handle })
  }));
}

function chooseLocalFileWithInput(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mds,text/plain";
    input.hidden = true;

    const finish = (file?: File) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => finish(input.files?.[0]), { once: true });
    input.addEventListener("cancel", () => finish(), { once: true });
    document.body.append(input);
    input.click();
  });
}

function downloadLocalDocument(name: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function createLocalDocumentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isFilePickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
