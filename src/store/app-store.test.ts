import { beforeEach, describe, expect, it, vi } from "vitest";

// The store persists to localStorage, which doesn't exist in the Node test
// environment — provide an in-memory stand-in before the store module loads.
function createMemoryStorage(): Storage {
  let data: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      data = {};
    },
  };
}

vi.stubGlobal("localStorage", createMemoryStorage());

const { useAppStore, exportStateToJSON, parseExportedState } = await import(
  "@/store/app-store"
);

const LEAF = "prelims.gs.polity.constitution.fundamental-rights";
const OTHER_LEAF = "prelims.gs.polity.constitution.dpsp";

describe("app store", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("stores a topic status and removes it when set back to not-started", () => {
    useAppStore.getState().setStatus(LEAF, "completed");
    expect(useAppStore.getState().progress[LEAF]).toBe("completed");

    useAppStore.getState().setStatus(LEAF, "not-started");
    expect(useAppStore.getState().progress[LEAF]).toBeUndefined();
  });

  it("keeps recent topics deduplicated, newest first, capped at 8", () => {
    const { touchRecent } = useAppStore.getState();
    for (let i = 0; i < 10; i++) touchRecent(`topic-${i}`);
    touchRecent("topic-5");

    const recents = useAppStore.getState().recentTopics;
    expect(recents).toHaveLength(8);
    expect(recents[0]).toBe("topic-5");
    expect(recents.filter((id) => id === "topic-5")).toHaveLength(1);
  });

  it("round-trips through export and import", () => {
    const state = useAppStore.getState();
    state.setStatus(LEAF, "revised");
    state.setDisplayName("Nikhil");
    state.setExamDate("2027-05-30");

    const result = parseExportedState(exportStateToJSON());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    state.resetAll();
    expect(useAppStore.getState().progress[LEAF]).toBeUndefined();

    useAppStore.getState().importState(result.data);
    const restored = useAppStore.getState();
    expect(restored.progress[LEAF]).toBe("revised");
    expect(restored.displayName).toBe("Nikhil");
    expect(restored.examDate).toBe("2027-05-30");
  });
});

describe("backup validation", () => {
  it("rejects invalid JSON with a friendly message", () => {
    const result = parseExportedState("not json {");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not valid JSON");
  });

  it("rejects files from other apps", () => {
    const result = parseExportedState(JSON.stringify({ app: "something-else" }));
    expect(result.ok).toBe(false);
  });

  it("rejects backups from a newer store version", () => {
    const result = parseExportedState(
      JSON.stringify({ app: "upsc-os", version: 999 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer version");
  });

  it("drops unknown topics and invalid statuses instead of failing", () => {
    const result = parseExportedState(
      JSON.stringify({
        app: "upsc-os",
        version: 1,
        progress: {
          [LEAF]: "completed",
          "no.such.topic": "completed",
          [OTHER_LEAF]: "definitely-not-a-status",
        },
        displayName: 42,
        examDate: "31/05/2027",
        recentTopics: [LEAF, "also.not.real", 7],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.progress).toEqual({ [LEAF]: "completed" });
    expect(result.data.displayName).toBe("");
    expect(result.data.examDate).toBe("");
    expect(result.data.recentTopics).toEqual([LEAF]);
  });
});
