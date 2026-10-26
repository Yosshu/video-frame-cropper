# Video Frame Cropper

**動画フレーム切り出しツール** — 動画の好きなフレームを選び、範囲を切り抜いて画像として保存できる Web アプリです。
インストール不要で、ブラウザで開くだけで使えます。

👉 **https://yosshu.github.io/video-frame-cropper/**

[English](#english) follows the Japanese section.

## 特長

- **インストール不要**：Python などの環境構築なしで、ブラウザだけで動きます。
- **動画はアップロードされません**：読み込みから切り抜きまで、すべてお使いのブラウザの中で処理します。
- **フレーム番号が正確**：動画ファイルに記録された各フレームの時刻から番号を割り出すので、可変フレームレートの動画でも番号がずれません。
- **同じ範囲を連続で切り出せる**：範囲はフレームを移動しても残るので、`→` で送って `S` で保存、を繰り返すだけです。
- **日本語 / English** を切り替えられます。

## 使い方

1. 「動画を開く」で動画を選びます（ページに動画をドロップしても開けます）。
2. スライダー・フレーム番号の入力・`←` `→` キーで、切り出したいフレームに移動します。
3. 画像の上をドラッグして範囲を選びます。座標（x1, y1, x2, y2）を入力して Enter でも指定できます。範囲を選ばなければフレーム全体を保存します。
4. 「保存」を押すと画像がダウンロードされます。形式は JPEG・PNG・WebP から選べます。

### キーボードショートカット

| キー | 動作 |
| --- | --- |
| `S`（または `T`） | 表示中のフレームを保存 |
| `O` | 動画を開く |
| `←` / `→` | 1 フレーム戻る / 進む |
| `Shift` + `←` / `→` | 10 フレーム戻る / 進む |
| `Home` / `End` | 最初 / 最後のフレームへ |
| `Esc` | 選択を解除 |

### 保存されるファイル名

```
<動画名>_f<フレーム番号>_x<x1>_y<y1>_x<x2>_y<y2>.jpg   例: 運動会_f0120_x100_y50_x740_y530.jpg
<動画名>_f<フレーム番号>.jpg                           範囲を選ばなかった場合
```

- フレーム番号は 0 から数え、ファイルが番号順に並ぶよう桁をそろえて 0 で埋めます。
- 座標は元の動画のピクセル単位です。`x2`・`y2` の列・行は含みません（切り抜きサイズは `(x2 - x1) × (y2 - y1)`）。

### 対応している動画

- **MP4・MOV・M4V・WebM・MKV・TS**：ブラウザ内蔵の機能（WebCodecs）で高速に読み込みます。圧縮形式は H.264・H.265/HEVC・VP8・VP9・AV1（どれを読めるかはブラウザによって異なります）。
- **AVI・WMV・FLV・MPG など**、またはブラウザが読めない圧縮形式（ProRes、環境によっては HEVC など）：自動的に**互換モード**（ffmpeg の WebAssembly 版）で読み込みます。初回だけ約 30 MB のダウンロードがあり、フレームの表示も少し遅くなります。WebCodecs のないブラウザ（Android 版 Firefox など）でも互換モードで動きます。
- 推奨ブラウザ：最新の Chrome・Edge・Safari・Firefox（パソコン）
- 色について：ブラウザは色空間の情報が書かれていない HD 動画を BT.709 として解釈するため、OpenCV（BT.601 として解釈）で切り出した画像とは色がわずかに異なることがあります。フレームの番号と切り抜く位置は OpenCV と一致することを確認しています。

## 開発

```bash
npm install
npm run dev         # 開発サーバー
npm test            # 単体テスト（Vitest）
npm run test:e2e    # ブラウザでの通しテスト（Playwright）
npm run build       # dist/ に公開用ファイルを出力
```

- Vite + TypeScript（フレームワークなし）。動画の読み込みに [Mediabunny](https://mediabunny.dev/)、デコードにブラウザの WebCodecs、互換モードに [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) を使っています。
- `main` ブランチと `claude/*` ブランチへの push で、GitHub Actions が GitHub Pages に自動公開します。
- テスト用の動画（`tests/fixtures`）は `npm run fixtures` で作り直せます（ffmpeg が必要）。各フレームに自分のフレーム番号が白黒の縞として描かれていて、表示・保存された画像が正しいフレームかをテストで確かめています。

---

## English

**Video Frame Cropper** lets you pick any frame of a video, crop a region and save it as an image — right in your browser, with nothing to install.

👉 **https://yosshu.github.io/video-frame-cropper/**

### Highlights

- **Nothing to install** — no Python or other setup; just open the page.
- **Your video is never uploaded** — everything runs locally in your browser.
- **Exact frame numbers** — frames are numbered from the timestamps stored in the file, so they stay correct even for variable frame rate videos.
- **Cut the same region from many frames** — the selection stays when you move between frames: press `→`, then `S`, and repeat.
- **Japanese / English** user interface.

### How to use

1. Click **Open video** and choose a video (or drop it onto the page).
2. Go to the frame you want with the slider, the frame number field or the `←` `→` keys.
3. Drag on the image to select a region, or type the coordinates (x1, y1, x2, y2) and press Enter. Without a selection the whole frame is saved.
4. Click **Save** to download the image as JPEG, PNG or WebP.

| Key | Action |
| --- | --- |
| `S` (or `T`) | Save the current frame |
| `O` | Open a video |
| `←` / `→` | Previous / next frame |
| `Shift` + `←` / `→` | 10 frames back / forward |
| `Home` / `End` | First / last frame |
| `Esc` | Clear the selection |

Saved images are named `<video>_f<frame>_x<x1>_y<y1>_x<x2>_y<y2>.<ext>` (or `<video>_f<frame>.<ext>` without a selection). Frame numbers start at 0 and are zero-padded; coordinates are in video pixels, and the `x2` column / `y2` row are not included.

Supported videos:

- **MP4, MOV, M4V, WebM, MKV, TS** are read with the browser's own decoders (WebCodecs): H.264, H.265/HEVC, VP8, VP9, AV1 (support depends on the browser).
- **AVI, WMV, FLV, MPG** and videos with codecs the browser cannot decode (ProRes, HEVC in some browsers, …) open automatically in **compatibility mode** (ffmpeg compiled to WebAssembly). It downloads about 30 MB the first time and shows frames a little more slowly. Browsers without WebCodecs (such as Firefox for Android) use it too.
- Recommended: current desktop Chrome, Edge, Safari or Firefox.

### Development

```bash
npm install
npm run dev         # development server
npm test            # unit tests (Vitest)
npm run test:e2e    # end-to-end tests (Playwright)
npm run build       # production build in dist/
```

Built with Vite and TypeScript (no framework), [Mediabunny](https://mediabunny.dev/) for reading media files, the browser's WebCodecs API for decoding and [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for compatibility mode. Pushes to `main` and `claude/*` branches are deployed to GitHub Pages by GitHub Actions.

## Third-party software

| Component | License | Source |
| --- | --- | --- |
| [Mediabunny](https://mediabunny.dev/) | MPL-2.0 | https://github.com/Vanilagy/mediabunny |
| @ffmpeg/ffmpeg (ffmpeg.wasm) | MIT | https://github.com/ffmpegwasm/ffmpeg.wasm |
| @ffmpeg/core (FFmpeg compiled to WebAssembly) | GPL-2.0-or-later | https://github.com/ffmpegwasm/ffmpeg.wasm, https://ffmpeg.org/download.html |

The FFmpeg core is only downloaded in compatibility mode. The same list ships with the site as [`third-party-licenses.txt`](public/third-party-licenses.txt).
本アプリが含むサードパーティ ソフトウェアとそのライセンスは上の表のとおりです（サイトにも `third-party-licenses.txt` として同梱しています）。
