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

  'sel.title': '切り抜き範囲',
  'sel.x1': '左端の位置（ピクセル）',
  'sel.y1': '上端の位置（ピクセル）',
  'sel.x2': '右端の位置（ピクセル）。この列は含みません',
  'sel.y2': '下端の位置（ピクセル）。この行は含みません',
  'sel.size': '{width} × {height} px',
  'sel.none': '未選択（フレーム全体）',
  'sel.hint': '画像の上をドラッグすると範囲を選択できます。座標を入力して Enter でも指定できます。',
  'sel.clear': '選択解除',
  'sel.clearTooltip': '選択を解除する（Esc キー）',

  'save.format': '形式',
  'save.quality': '画質',
  'save.qualityTooltip': 'JPEG・WebP の画質（1〜100）',
  'save.label': '保存',
  'save.tooltip': '表示中のフレームを画像として保存（S キー）',
  'save.fileName': '保存名：{name}',
  'toast.saved': '保存しました：{name}',

  'help.title': '使い方',
  'help.step1': '「動画を開く」で動画を選びます（ページに動画をドロップしても開けます）。',
  'help.step2': 'スライダー・フレーム番号・← → キーで、切り出したいフレームに移動します。',
  'help.step3': '画像の上をドラッグして範囲を選びます。選ばなければフレーム全体を保存します。',
  'help.step4': '「保存」を押すと、画像がダウンロードされます。',
  'help.tip':
    '範囲はフレームを移動しても残るので、→ キーで送りながら S キーで保存すれば、同じ範囲を何枚でも続けて切り出せます。',
  'help.shortcuts': 'キーボードショートカット',
  'help.keySave': '表示中のフレームを保存',
  'help.keyOpen': '動画を開く',
  'help.keyStep': '1 フレーム戻る／進む',
  'help.keyStep10': '10 フレーム戻る／進む',
  'help.keyEnds': '最初／最後のフレームへ',
  'help.keyClear': '選択を解除',
  'help.fileNames': '保存されるファイル名',
  'help.fileNamesText':
    '「動画名_f〈フレーム番号〉_x〈左〉_y〈上〉_x〈右〉_y〈下〉」の形式です。範囲を選ばなかった場合は「動画名_f〈フレーム番号〉」になります。フレーム番号は、ファイルが番号順に並ぶよう 0 で桁をそろえます。',
  'help.formats': '対応している動画',
  'help.formatsText':
    'MP4・MOV・WebM・MKV・TS（H.264・H.265/HEVC・VP8・VP9・AV1）。どの圧縮形式を読めるかは、お使いのブラウザによって異なります。',
  'help.privacy': '動画はどこにもアップロードされません。読み込みも切り抜きも、すべてお使いのブラウザの中で行われます。',
  'meta.variableFps': '平均 {fps} fps（可変フレームレート）',
  'drop.titleTouch': '動画を選んでください',

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
  'error.save': '画像を保存できませんでした。（{detail}）',
  'error.frameNotReady': 'フレームの読み込みが終わっていないため、保存できませんでした。',

  'footer.privacy': '動画はアップロードされません。すべての処理はお使いのブラウザ内で行われます。',
  'footer.source': 'ソースコード',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof ja;
