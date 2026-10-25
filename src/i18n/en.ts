import type { MessageKey } from './ja';

export const en: Record<MessageKey, string> = {
  'doc.title': 'Video Frame Cropper — crop frames from videos',
  'doc.description':
    'Pick any frame of a video, crop a region and save it as an image. Your video is never uploaded — everything runs in your browser.',

  'app.subtitle': 'Crop frames from videos',

  'header.open': 'Open video',
  'header.openTooltip': 'Open a video file (O key)',
  'header.help': 'Help & shortcuts',
  'header.language': 'Language',

  'drop.title': 'Drop a video here',
  'drop.or': 'or',
  'drop.choose': 'Choose a file',
  'drop.formats': 'Supports MP4, MOV, WebM, MKV and more',
  'drop.privacy': 'Your video is never uploaded — it is processed entirely in your browser.',

  'drop.release': 'Drop to open the video',

  'busy.opening': 'Opening video…',
  'busy.indexing': 'Counting frames… ({count})',

  'meta.frames': '{count} frames',

  'nav.prev': 'Previous frame (←)',
  'nav.next': 'Next frame (→)',
  'nav.slider': 'Frame position',
  'nav.frame': 'Frame',
  'nav.frameTooltip': 'Frame number (counted from 0). Type a number and press Enter to jump.',
  'nav.time': 'Time from the start',

  'sel.title': 'Crop region',
  'sel.x1': 'Left edge (pixels)',
  'sel.y1': 'Top edge (pixels)',
  'sel.x2': 'Right edge (pixels), not included',
  'sel.y2': 'Bottom edge (pixels), not included',
  'sel.size': '{width} × {height} px',
  'sel.none': 'None (whole frame)',
  'sel.hint': 'Drag on the image to select a region, or type coordinates and press Enter.',
  'sel.clear': 'Clear selection',
  'sel.clearTooltip': 'Clear the selection (Esc key)',

  'save.format': 'Format',
  'save.quality': 'Quality',
  'save.qualityTooltip': 'JPEG / WebP quality (1–100)',
  'save.label': 'Save',
  'save.tooltip': 'Save the current frame as an image (S key)',
  'save.fileName': 'File name: {name}',
  'toast.saved': 'Saved: {name}',

  'help.title': 'How to use',
  'help.step1': 'Click “Open video” and choose a video (or drop it onto the page).',
  'help.step2': 'Go to the frame you want with the slider, the frame number or the ← → keys.',
  'help.step3': 'Drag on the image to select a region. Without a selection the whole frame is saved.',
  'help.step4': 'Click “Save” to download the image.',
  'help.tip':
    'The region stays when you move between frames, so pressing → and then S repeatedly cuts the same region from as many frames as you like.',
  'help.shortcuts': 'Keyboard shortcuts',
  'help.keySave': 'Save the current frame',
  'help.keyOpen': 'Open a video',
  'help.keyStep': 'Previous / next frame',
  'help.keyStep10': '10 frames back / forward',
  'help.keyEnds': 'First / last frame',
  'help.keyClear': 'Clear the selection',
  'help.fileNames': 'File names',
  'help.fileNamesText':
    'Images are named “video name_f<frame>_x<left>_y<top>_x<right>_y<bottom>”, or “video name_f<frame>” without a selection. Frame numbers are zero-padded so the files sort in order.',
  'help.formats': 'Supported videos',
  'help.formatsText':
    'MP4, MOV, WebM, MKV and TS (H.264, H.265/HEVC, VP8, VP9, AV1). Which codecs can be read depends on your browser.',
  'help.privacy': 'Your video is never uploaded. Opening and cropping both happen entirely in your browser.',
  'meta.variableFps': '{fps} fps on average (variable frame rate)',
  'drop.titleTouch': 'Choose a video',

  'alert.close': 'Close',
  'error.open.unsupported-format': 'Could not open the video. This file format is not supported.',
  'error.open.no-video-track': 'Could not open the video. This file contains no video track.',
  'error.open.unsupported-codec': 'Could not open the video. Your browser cannot decode its codec ({codec}).',
  'error.open.unsupported-codec-unknown': 'Could not open the video. Your browser cannot decode its codec.',
  'error.open.no-frames': 'Could not open the video. It contains no frames.',
  'error.open.read-failed': 'Could not open the video. An error occurred while reading the file. ({detail})',
  'error.decode': 'Could not load frame {frame}.',
  'error.save': 'Could not save the image. ({detail})',
  'error.frameNotReady': 'The frame has not finished loading, so it could not be saved.',

  'footer.privacy': 'Your video is never uploaded. Everything runs locally in your browser.',
  'footer.source': 'Source code',
};
