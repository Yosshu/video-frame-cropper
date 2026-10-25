import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const H264 = path.join(fixtures, 'frames-h264.mp4'); // 150 frames, 320×180, B-frames, GOP 60
const VP9 = path.join(fixtures, 'frames-vp9.webm'); // 100 frames, 320×180

/**
 * The fixtures show their frame number as 8 vertical stripes (bit 0 on the left, white = 1).
 * Reads it back from an image's pixels inside the page.
 */
async function decodeFrameNumber(page: Page, source: 'canvas' | { dataUrl: string }): Promise<number> {
  return page.evaluate(async (src) => {
    let canvas: HTMLCanvasElement;
    if (src === 'canvas') {
      canvas = document.getElementById('frame-canvas') as HTMLCanvasElement;
    } else {
      const image = new Image();
      image.src = src.dataUrl;
      await image.decode();
      canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
    }
    const ctx = canvas.getContext('2d')!;
    let value = 0;
    for (let bit = 0; bit < 8; bit++) {
      const x = Math.floor(((bit + 0.5) * canvas.width) / 8);
      const [r] = ctx.getImageData(x, Math.floor(canvas.height / 2), 1, 1).data;
      if (r! > 128) value |= 1 << bit;
    }
    return value;
  }, source);
}

async function openVideo(page: Page, file: string): Promise<void> {
  await page.goto('./');
  await page.setInputFiles('#file-input', file);
  await expect(page.locator('#workspace')).toBeVisible();
  await waitForFrame(page);
}

async function waitForFrame(page: Page): Promise<void> {
  await expect(page.locator('#frame-box')).not.toHaveClass(/is-loading/);
}

async function expectShownFrame(page: Page, frame: number): Promise<void> {
  await waitForFrame(page);
  await expect(page.locator('#frame-input')).toHaveValue(String(frame));
  expect(await decodeFrameNumber(page, 'canvas')).toBe(frame);
}

async function goToFrame(page: Page, frame: number): Promise<void> {
  await page.fill('#frame-input', String(frame));
  await page.press('#frame-input', 'Enter');
}

for (const [name, file, frameCount] of [
  ['H.264', H264, 150],
  ['VP9', VP9, 100],
] as const) {
  test(`shows exactly the requested frame (${name})`, async ({ page }) => {
    await openVideo(page, file);
    await expect(page.locator('#video-meta')).toContainText(`${frameCount} フレーム`);
    await expectShownFrame(page, 0);

    for (const step of [1, 2, 3]) {
      await page.keyboard.press('ArrowRight');
      await expectShownFrame(page, step);
    }
    await goToFrame(page, 59);
    await expectShownFrame(page, 59);
    await page.keyboard.press('ArrowRight'); // across a key frame
    await expectShownFrame(page, 60);
    await page.keyboard.press('Shift+ArrowLeft');
    await expectShownFrame(page, 50);
    await page.keyboard.press('ArrowLeft'); // backwards needs a fresh decode
    await expectShownFrame(page, 49);
    await page.keyboard.press('End');
    await expectShownFrame(page, frameCount - 1);
    await page.keyboard.press('Home');
    await expectShownFrame(page, 0);

    // Dragging the slider quickly only has to end on the right frame.
    await page.locator('#frame-slider').evaluate((slider: HTMLInputElement) => {
      for (const value of [10, 40, 90, 33]) {
        slider.value = String(value);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await expectShownFrame(page, 33);

    await goToFrame(page, 99999);
    await expectShownFrame(page, frameCount - 1);
  });
}

test('steps backwards frame by frame across a key frame', async ({ page }) => {
  await openVideo(page, H264);
  await goToFrame(page, 125);
  await expectShownFrame(page, 125);
  // Frames 120–125 come after the key frame at 120; 119 and below belong to the previous GOP.
  for (let frame = 124; frame >= 112; frame--) {
    await page.keyboard.press('ArrowLeft');
    await expectShownFrame(page, frame);
  }
  for (let frame = 113; frame <= 122; frame++) {
    await page.keyboard.press('ArrowRight');
    await expectShownFrame(page, frame);
  }
});

test('saves the selected region of the current frame', async ({ page }) => {
  await openVideo(page, H264);
  await goToFrame(page, 77);
  await expectShownFrame(page, 77);

  // Type the corners in the "wrong" order: they are normalized on Enter.
  await page.fill('#sel-x1', '320');
  await page.fill('#sel-y1', '120');
  await page.fill('#sel-x2', '0');
  await page.fill('#sel-y2', '40');
  await page.press('#sel-y2', 'Enter');
  await expect(page.locator('#sel-size')).toHaveText('320 × 80 px');
  await page.locator('#frame-slider').focus();

  await page.selectOption('#save-format', 'png');
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('s')]);
  expect(download.suggestedFilename()).toBe('frames-h264_f077_x0_y40_x320_y120.png');
  await expect(page.locator('#toast')).toContainText('frames-h264_f077_x0_y40_x320_y120.png');

  const bytes = await readFile(await download.path());
  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  const size = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, dataUrl);
  expect(size).toEqual([320, 80]);
  expect(await decodeFrameNumber(page, { dataUrl })).toBe(77);

  // The selection stays when moving on, so the next frame can be saved right away.
  await page.keyboard.press('ArrowRight');
  await expectShownFrame(page, 78);
  const [next] = await Promise.all([page.waitForEvent('download'), page.click('#save-button')]);
  expect(next.suggestedFilename()).toBe('frames-h264_f078_x0_y40_x320_y120.png');
});

test('saves the whole frame without a selection', async ({ page }) => {
  await openVideo(page, VP9);
  await page.selectOption('#save-format', 'jpeg');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#save-button')]);
  expect(download.suggestedFilename()).toBe('frames-vp9_f00.jpg');
});

test('selects a region by dragging and clears it with Esc', async ({ page }) => {
  await openVideo(page, H264);
  const box = (await page.locator('#frame-box').boundingBox())!;
  const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;

  await page.mouse.move(...at(0.75, 0.75));
  await page.mouse.down();
  await page.mouse.move(...at(0.5, 0.5), { steps: 4 });
  await page.mouse.move(...at(0.25, 0.25), { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('#sel-x1')).toHaveValue('80');
  await expect(page.locator('#sel-y1')).toHaveValue('45');
  await expect(page.locator('#sel-x2')).toHaveValue('240');
  await expect(page.locator('#sel-y2')).toHaveValue('135');
  await expect(page.locator('#selection-label')).toHaveText('160 × 90');

  // Dragging past the edge of the image is clamped to the frame.
  await page.mouse.move(...at(0.5, 0.5));
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 100, box.y + box.height + 100, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('#sel-x2')).toHaveValue('320');
  await expect(page.locator('#sel-y2')).toHaveValue('180');

  await page.keyboard.press('Escape');
  await expect(page.locator('#sel-x1')).toHaveValue('');
  await expect(page.locator('#sel-size')).toHaveText('未選択（フレーム全体）');
});

test('switches between Japanese and English and remembers the choice', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#open-button')).toContainText('動画を開く');
  await page.click('[data-lang="en"]');
  await expect(page.locator('#open-button')).toContainText('Open video');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('#open-button')).toContainText('Open video');
  await page.goto('./?lang=ja');
  await expect(page.locator('#open-button')).toContainText('動画を開く');
});

test('explains when a file cannot be opened', async ({ page }) => {
  await page.goto('./');
  await page.setInputFiles('#file-input', {
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a video'),
  });
  await expect(page.locator('#alert')).toBeVisible();
  await expect(page.locator('#alert-text')).toContainText('動画を開けませんでした');
  await expect(page.locator('#dropzone')).toBeVisible();
});
