'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EquipmentItem } from '@/lib/tech-workflow';

export type JobPhotoKind = 'before' | 'install' | 'after';

export type JobPhoto = {
  id: string;
  kind: JobPhotoKind;
  url: string;
  takenAt: string;
};

export type JobIssue = {
  title: string;
  open: boolean;
};

type JobExtras = {
  photos: JobPhoto[];
  equipment: EquipmentItem[];
  issue: JobIssue | null;
};

const KEY = '4ds-tech-job-extras';

function readAll(): Record<string, JobExtras> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, JobExtras>;
  } catch {
    return {};
  }
}

export function useJobExtras(jobId: string, seedEquipment: EquipmentItem[]) {
  const seedKey = useMemo(
    () => seedEquipment.map((item) => item.id).join('|'),
    [seedEquipment],
  );

  const [extras, setExtras] = useState<JobExtras>(() => ({
    photos: [],
    equipment: seedEquipment,
    issue: null,
  }));

  const seedRef = useRef(seedEquipment);
  seedRef.current = seedEquipment;

  useEffect(() => {
    const stored = readAll()[jobId];
    const seed = seedRef.current;
    const storedEquip = stored?.equipment ?? [];
    const byId = new Map(storedEquip.map((item) => [item.id, item]));
    const equipment = seed.map((item) => byId.get(item.id) ?? item);
    for (const extra of storedEquip) {
      if (!seed.some((item) => item.id === extra.id)) equipment.push(extra);
    }
    setExtras({
      photos: stored?.photos ?? [],
      equipment: equipment.length ? equipment : seed,
      issue: stored?.issue ?? null,
    });
  }, [jobId, seedKey]);

  const addPhoto = useCallback((kind: JobPhotoKind, url: string) => {
    setExtras((prev) => {
      const next = {
        ...prev,
        photos: [
          ...prev.photos.filter((p) => p.kind !== kind),
          { id: `${kind}-${Date.now()}`, kind, url, takenAt: new Date().toISOString() },
        ],
      };
      const all = readAll();
      all[jobId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
      return next;
    });
  }, [jobId]);

  const removePhoto = useCallback((id: string) => {
    setExtras((prev) => {
      const next = { ...prev, photos: prev.photos.filter((p) => p.id !== id) };
      const all = readAll();
      all[jobId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
      return next;
    });
  }, [jobId]);

  const updateEquipment = useCallback((item: EquipmentItem) => {
    setExtras((prev) => {
      const next = {
        ...prev,
        equipment: prev.equipment.map((row) => (row.id === item.id ? item : row)),
      };
      const all = readAll();
      all[jobId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
      return next;
    });
  }, [jobId]);

  const patchEquipment = useCallback((id: string, patch: Partial<EquipmentItem>) => {
    setExtras((prev) => {
      const next = {
        ...prev,
        equipment: prev.equipment.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      };
      const all = readAll();
      all[jobId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
      return next;
    });
  }, [jobId]);

  const setIssue = useCallback((issue: JobIssue | null) => {
    setExtras((prev) => {
      const next = { ...prev, issue };
      const all = readAll();
      all[jobId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
      return next;
    });
  }, [jobId]);

  return { extras, addPhoto, removePhoto, updateEquipment, patchEquipment, setIssue };
}
