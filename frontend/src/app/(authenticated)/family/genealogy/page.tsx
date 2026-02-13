'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import { authFetch } from '@/lib/api-client';

export default function GenealogyPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: any[] } | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['genealogy-profiles', activeFamilyId],
    queryFn: async () => {
      const res = await authFetch<{ data: any[] }>(
        `/api/genealogy/${activeFamilyId}/profiles`,
        { token: accessToken ?? undefined },
      );
      return res.data;
    },
    enabled: !!activeFamilyId && !!accessToken,
  });

  const { data: validation } = useQuery({
    queryKey: ['genealogy-validation', activeFamilyId],
    queryFn: async () => {
      const res = await authFetch<{ data: { valid: boolean; conflicts: string[] } }>(
        `/api/genealogy/${activeFamilyId}/validate`,
        { token: accessToken ?? undefined },
      );
      return res.data;
    },
    enabled: !!activeFamilyId && !!accessToken,
  });

  const importGedcom = useMutation({
    mutationFn: async (content: string) => {
      return authFetch<{ data: { imported: number; duplicates: any[] } }>(
        `/api/genealogy/${activeFamilyId}/import/gedcom`,
        { method: 'POST', body: { content }, token: accessToken ?? undefined },
      );
    },
    onSuccess: (data) => {
      setImportResult(data.data);
      queryClient.invalidateQueries({ queryKey: ['genealogy-profiles'] });
    },
  });

  async function handleImport() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    importGedcom.mutate(content);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleExport() {
    window.open(
      `${process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'}/api/genealogy/${activeFamilyId}/export/gedcom`,
      '_blank',
    );
  }

  if (!activeFamilyId) {
    return <div className="py-20 text-center text-slate-500">Select a family first.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 sm:pl-56">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Genealogy</h1>
        <div className="flex gap-2">
          <button onClick={handleImport} className="btn-secondary text-sm">Import GEDCOM</button>
          <button onClick={handleExport} className="btn-secondary text-sm">Export GEDCOM</button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ged,.gedcom"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Validation warnings */}
      {validation && !validation.valid && (
        <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <p className="mb-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">Relationship conflicts detected:</p>
          <ul className="list-inside list-disc text-xs text-yellow-600 dark:text-yellow-500">
            {validation.conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-sm text-green-700 dark:text-green-400">
            Imported {importResult.imported} profiles.
            {importResult.duplicates.length > 0 && ` ${importResult.duplicates.length} duplicates skipped.`}
          </p>
        </div>
      )}

      {/* Profiles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : !profiles || profiles.length === 0 ? (
        <div className="py-10 text-center text-slate-400">No genealogy profiles yet. Import a GEDCOM file or add profiles manually.</div>
      ) : (
        <div className="space-y-2">
          {profiles.map((p: any) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.full_name}</p>
                <p className="text-xs text-slate-500">
                  {[p.birth_date && `Born: ${p.birth_date}`, p.birth_place, p.death_date && `Died: ${p.death_date}`]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              {p.gender && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  {p.gender}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
