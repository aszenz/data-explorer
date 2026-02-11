import type * as Monaco from "monaco-editor-core";

let monacoInstance: typeof Monaco | undefined;

export async function getMonaco(): Promise<typeof Monaco> {
  if (undefined !== monacoInstance) {
    return monacoInstance;
  }
  const monaco = await import("monaco-editor-core");
  const { default: editorWorker } =
    await import("monaco-editor-core/esm/vs/editor/editor.worker.start?worker");
  self.MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };
  monacoInstance = monaco;
  return monaco;
}
