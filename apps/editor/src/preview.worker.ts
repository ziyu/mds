import { createPreviewCompiler, type PreviewRequest } from "./preview-compiler.js";

const compile = createPreviewCompiler();
self.onmessage = (event: MessageEvent<PreviewRequest>) => {
  self.postMessage(compile(event.data));
};
