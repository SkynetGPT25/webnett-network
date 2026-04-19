// @ts-nocheck

export const STORAGE_KEY = "webnett-local-node";

export function loadNodeState() {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveNodeState(state: any) {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearNodeState() {
  if (typeof window === "undefined") return false;

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function createExportPackage(state: any) {
  return JSON.stringify(
    {
      ...state,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function parseImportPackage(importData: string) {
  try {
    const parsed = JSON.parse(importData);

    if (!parsed?.chain?.length || !parsed?.wallets?.length) {
      return {
        ok: false,
        error: "Import failed: package must include chain and wallets.",
        data: null,
      };
    }

    return {
      ok: true,
      error: null,
      data: parsed,
    };
  } catch {
    return {
      ok: false,
      error: "Import failed: invalid JSON package.",
      data: null,
    };
  }
}
