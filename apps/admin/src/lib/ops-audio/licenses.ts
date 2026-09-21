/**
 * Provenance registry for production audio assets.
 * Current build uses synthesized Web Audio tones (no third-party files).
 * When replacing with WAV/OGG/M4A, record source URL, creator, license, date, attribution.
 */

export type AudioLicenseRecord = {
  assetId: string;
  file?: string;
  sourceUrl: string;
  creator: string;
  license: 'SYNTH_INTERNAL' | 'CC0' | 'MIXKIT' | 'ZAPSPLAT_STANDARD' | 'ZAPSPLAT_CC0' | 'OTHER';
  downloadDate: string;
  attributionRequired: boolean;
  notes: string;
};

/** Empty / synth-only — populate when shipping licensed files. */
export const AUDIO_LICENSE_REGISTRY: AudioLicenseRecord[] = [
  {
    assetId: 'synth-pack-v1',
    sourceUrl: 'internal://ops-audio/catalog',
    creator: '4DS Solutions',
    license: 'SYNTH_INTERNAL',
    downloadDate: '2026-09-21',
    attributionRequired: false,
    notes:
      'All shipping cues are Web Audio synthesized. Third-party files must not be added without a completed license row.',
  },
];

export function assertLicenseRecorded(assetId: string) {
  return AUDIO_LICENSE_REGISTRY.some((r) => r.assetId === assetId);
}
