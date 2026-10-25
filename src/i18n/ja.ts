// Japanese messages. This dictionary defines the set of message keys; every other
// language must provide exactly the same keys (enforced by the type of `en`).
export const ja = {
  'doc.title': 'Video Frame Cropper — 動画フレーム切り出しツール',
  'doc.description':
    '動画の好きなフレームを選び、範囲を切り抜いて画像として保存できるWebアプリ。動画はアップロードされず、ブラウザの中だけで処理されます。',

  'app.subtitle': '動画フレーム切り出しツール',

  'header.open': '動画を開く',
  'header.openTooltip': '動画ファイルを開く（O キー）',
  'header.help': '使い方とショートカット',
  'header.language': '表示言語',

  'drop.title': 'ここに動画をドロップ',
  'drop.or': 'または',
  'drop.choose': 'ファイルを選択',
  'drop.formats': 'MP4・MOV・WebM・MKV などに対応',
  'drop.privacy': '動画はアップロードされず、お使いのブラウザの中だけで処理されます。',

  'drop.release': 'ドロップして動画を開く',

  'busy.opening': '動画を読み込んでいます…',
  'busy.indexing': 'フレームを数えています…（{count}）',

  'meta.frames': '{count} フレーム',

  'nav.prev': '前のフレーム（←）',
  'nav.next': '次のフレーム（→）',
  'nav.slider': 'フレーム位置',
  'nav.frame': 'フレーム',
  'nav.frameTooltip': 'フレーム番号（0 から数えます）。入力して Enter で移動します。',
  'nav.time': '先頭からの時間',

  'alert.close': '閉じる',
  'error.open.unsupported-format': '動画を開けませんでした。このファイル形式には対応していません。',
  'error.open.no-video-track': '動画を開けませんでした。このファイルには映像が含まれていません。',
  'error.open.unsupported-codec':
    '動画を開けませんでした。この動画の圧縮形式（{codec}）は、お使いのブラウザでは読み込めません。',
  'error.open.unsupported-codec-unknown':
    '動画を開けませんでした。この動画の圧縮形式は、お使いのブラウザでは読み込めません。',
  'error.open.no-frames': '動画を開けませんでした。この動画にはフレームがありません。',
  'error.open.read-failed': '動画を開けませんでした。ファイルの読み込み中にエラーが発生しました。（{detail}）',
  'error.decode': 'フレーム {frame} を読み込めませんでした。',

  'footer.privacy': '動画はアップロードされません。すべての処理はお使いのブラウザ内で行われます。',
  'footer.source': 'ソースコード',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof ja;
