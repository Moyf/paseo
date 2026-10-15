// Test stub for expo-clipboard. The sidebar clipboard actions write strings; nothing in tests
// reads or renders the paste button, and the package ships uncompiled JSX in its .js build.
export const setStringAsync = async (): Promise<boolean> => true;
export const getStringAsync = async (): Promise<string> => "";
export const setImageAsync = async (): Promise<void> => undefined;
export const hasStringAsync = async (): Promise<boolean> => false;

export default { setStringAsync, getStringAsync };

export function ClipboardPasteButton(): null {
  return null;
}
