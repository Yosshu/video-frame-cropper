import { canEncode, IMAGE_FORMATS, type ImageFormat } from '../export';
import { localize } from '../i18n';

const FORMAT_KEY = 'vfc.format';
const QUALITY_KEY = 'vfc.quality';
const DEFAULT_QUALITY = 95;

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Settings then last for this visit only.
  }
}

export interface SavePanelElements {
  format: HTMLSelectElement;
  quality: HTMLInputElement;
  qualityField: HTMLElement;
  fileName: HTMLElement;
  save: HTMLButtonElement;
}

/** Output format and quality (remembered between visits), the file name preview and the save button. */
export class SavePanel {
  constructor(
    private readonly els: SavePanelElements,
    handlers: { save(): void; optionsChanged(): void },
  ) {
    for (const option of els.format.options) {
      if (!canEncode(option.value as ImageFormat)) option.remove();
    }
    const storedFormat = readSetting(FORMAT_KEY);
    if (storedFormat && [...els.format.options].some((o) => o.value === storedFormat)) {
      els.format.value = storedFormat;
    }
    els.quality.value = String(this.parseQuality(readSetting(QUALITY_KEY)));
    this.syncQualityField();

    els.format.addEventListener('change', () => {
      writeSetting(FORMAT_KEY, els.format.value);
      this.syncQualityField();
      handlers.optionsChanged();
    });
    els.quality.addEventListener('change', () => {
      els.quality.value = String(this.parseQuality(els.quality.value));
      writeSetting(QUALITY_KEY, els.quality.value);
    });
    els.save.addEventListener('click', () => handlers.save());
  }

  get format(): ImageFormat {
    return this.els.format.value as ImageFormat;
  }

  get quality(): number {
    return this.parseQuality(this.els.quality.value);
  }

  showFileName(name: string): void {
    localize(this.els.fileName, 'save.fileName', { name });
    this.els.fileName.title = name;
  }

  setBusy(busy: boolean): void {
    this.els.save.disabled = busy;
  }

  private parseQuality(value: string | null): number {
    const number = Number.parseInt(value ?? '', 10);
    return Number.isFinite(number) ? Math.min(Math.max(number, 1), 100) : DEFAULT_QUALITY;
  }

  private syncQualityField(): void {
    this.els.qualityField.hidden = !IMAGE_FORMATS[this.format].lossy;
  }
}
