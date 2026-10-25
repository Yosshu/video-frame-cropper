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

  'footer.privacy': '動画はアップロードされません。すべての処理はお使いのブラウザ内で行われます。',
  'footer.source': 'ソースコード',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof ja;
