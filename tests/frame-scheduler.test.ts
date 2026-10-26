import { describe, expect, it } from 'vitest';
import { FrameScheduler } from '../src/video/frame-scheduler';

function deferredLoader() {
  const loaded: number[] = [];
  const waiting: (() => void)[] = [];
  const scheduler = new FrameScheduler(
    (index) =>
      new Promise<void>((resolve) => {
        waiting.push(() => {
          loaded.push(index);
          resolve();
        });
      }),
  );
  const finishNext = async () => {
    waiting.shift()?.();
    await new Promise((r) => setTimeout(r, 0));
  };
  return { scheduler, loaded, finishNext };
}

describe('FrameScheduler', () => {
  it('loads only the newest request after the one in progress', async () => {
    const { scheduler, loaded, finishNext } = deferredLoader();
    const done = scheduler.request(1);
    scheduler.request(2);
    scheduler.request(3);
    scheduler.request(4);
    await finishNext();
    await finishNext();
    await done;
    expect(loaded).toEqual([1, 4]);
  });

  it('is idle again after the queue drains', async () => {
    const { scheduler, loaded, finishNext } = deferredLoader();
    scheduler.request(5);
    await finishNext();
    await scheduler.idle();
    scheduler.request(6);
    await finishNext();
    await scheduler.idle();
    expect(loaded).toEqual([5, 6]);
  });
});
