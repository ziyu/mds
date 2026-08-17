export const blockOpenPattern = /^:::\s+(.+?)\s*$/;
export const blockClosePattern = /^:::\s*$/;
export const leafBlockPattern = /^::\s+(.+?)\s*$/;
export const slotPattern = /^---\s+(.+?)\s*$/;
export const identifierPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
export const pathPattern = /^[A-Za-z][A-Za-z0-9_.-]*$/;
export const actionNamePattern = /^[A-Za-z][A-Za-z0-9_.:-]*$/;
export const mediaDirectivePattern =
  /^!(video|audio|embed|model|chart|map|file|download)\s+(.+?)\s*$/;
export const stateDeclarationPattern = /^@state\s+([A-Za-z][A-Za-z0-9_.-]*)\s+(.+?)\s*$/;
export const listDeclarationPattern = /^@list\s+([A-Za-z][A-Za-z0-9_.-]*)\s*$/;
export const formFieldPattern = /^\?\s+([A-Za-z][A-Za-z0-9_-]*)\s+(\S+)\s+(.+?)\s*$/;
export const singleLineCommentPattern = /^%%(?!%).*%%\s*$/;
export const multilineCommentPattern = /^%%%\s*$/;

export const nativeActions = new Set(["submit", "reset"]);
