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

  'alert.close': 'Close',
  'error.open.unsupported-format': 'Could not open the video. This file format is not supported.',
  'error.open.no-video-track': 'Could not open the video. This file contains no video track.',
  'error.open.unsupported-codec': 'Could not open the video. Your browser cannot decode its codec ({codec}).',
  'error.open.unsupported-codec-unknown': 'Could not open the video. Your browser cannot decode its codec.',
  'error.open.no-frames': 'Could not open the video. It contains no frames.',
  'error.open.read-failed': 'Could not open the video. An error occurred while reading the file. ({detail})',
  'error.decode': 'Could not load frame {frame}.',

  'footer.privacy': 'Your video is never uploaded. Everything runs locally in your browser.',
  'footer.source': 'Source code',
};
