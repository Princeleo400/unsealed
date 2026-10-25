import { beforeEach, describe, expect, it, vi } from 'vitest';

const playSound = vi.fn();
vi.mock('@/lib/feedback/sounds', () => ({
  playSound,
  unlockAudio: vi.fn(),
}));

function fakeBrowser(stored?: string) {
  const storage = new Map<string, string>();
  if (stored) storage.set('unsealed:feedback', stored);
  const vibrate = vi.fn(() => true);
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('navigator', { vibrate });
  return { storage, vibrate };
}

async function loadFeedback() {
  vi.resetModules();
  return import('@/lib/feedback');
}

describe('sound and vibration', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    playSound.mockClear();
  });

  it('play by default; small moments make a sound but no buzz', async () => {
    const { vibrate } = fakeBrowser();
    const { feedback } = await loadFeedback();
    feedback('tap');
    expect(playSound).toHaveBeenCalledWith('tap');
    expect(vibrate).not.toHaveBeenCalled();
    feedback('stamp');
    expect(vibrate).toHaveBeenCalledWith([20, 40, 140]);
  });

  it('respect the player’s switches and remember them', async () => {
    const { storage, vibrate } = fakeBrowser();
    const { feedback, setFeedbackSettings } = await loadFeedback();
    setFeedbackSettings({ sound: false });
    feedback('wrong');
    expect(playSound).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledTimes(1); // vibration is a separate switch
    setFeedbackSettings({ haptics: false });
    feedback('wrong');
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.get('unsealed:feedback')!)).toEqual({
      sound: false,
      haptics: false,
    });
  });

  it('read saved choices, and ignore broken ones', async () => {
    fakeBrowser('{"sound":false}');
    let module = await loadFeedback();
    module.feedback('coin');
    expect(playSound).not.toHaveBeenCalled();

    fakeBrowser('not json');
    module = await loadFeedback();
    module.feedback('coin');
    expect(playSound).toHaveBeenCalledWith('coin');
  });

  it('skip vibration quietly where the browser has none (iPhone)', async () => {
    fakeBrowser();
    vi.stubGlobal('navigator', {});
    const { feedback, canVibrate } = await loadFeedback();
    expect(canVibrate()).toBe(false);
    expect(() => feedback('breakthrough')).not.toThrow();
    expect(playSound).toHaveBeenCalledWith('breakthrough');
  });
});
