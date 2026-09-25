'use client';
import { useT } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GeoCommune, GeoDepartment } from '@/lib/places';

let cache: Promise<GeoDepartment[]> | null = null;

/** Les 12 départements et 77 communes (chargés une fois par session). */
export function loadDepartments(): Promise<GeoDepartment[]> {
  if (cache) return cache;
  const p = api<GeoDepartment[]>('/geo/departments').catch((e: unknown) => {
    cache = null;
    throw e;
  });
  cache = p;
  return p;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<GeoDepartment[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadDepartments()
      .then((d) => alive && setDepartments(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);
  return { departments, error };
}

export function findCommune(departments: GeoDepartment[] | null, name: string): (GeoCommune & { department: string }) | null {
  for (const d of departments ?? []) {
    const c = d.communes.find((x) => x.name === name);
    if (c) return { ...c, department: d.name };
  }
  return null;
}

/** Liste déroulante des communes, groupées par département. */
export function CommuneSelect({
  value,
  onChange,
  id,
  label,
  placeholder,
  allowEmpty = true,
}: {
  value: string;
  onChange: (name: string, commune: (GeoCommune & { department: string }) | null) => void;
  id: string;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const t = useT();
  const { departments, error } = useDepartments();
  return (
    <label htmlFor={id} className="block">
      <span className="label mb-1.5 block">{label ?? t('Ma commune')}</span>
      <select
        id={id}
        className="input"
        value={value}
        disabled={!departments}
        onChange={(e) => onChange(e.target.value, findCommune(departments, e.target.value))}
      >
        {allowEmpty && <option value="">{departments ? (placeholder ?? t('Choisir une commune')) : t(error ? 'Liste indisponible (réseau)' : 'Chargement…')}</option>}
        {!allowEmpty && !departments && <option value={value}>{value || t('Chargement…')}</option>}
        {departments?.map((d) => (
          <optgroup key={d.code} label={d.name}>
            {d.communes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
