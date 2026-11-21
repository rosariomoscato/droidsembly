// Shared by direct hiring, hiring approvals and an existing cloud worker's Setup.
import { WORKER_PROFILES, type WorkerProfile } from '../../../shared/workerProfiles';
import { T, useT } from '../i18n';

export function WorkerProfileSelect({ value, onChange, disabled }: { value?: WorkerProfile; onChange(value: WorkerProfile): void; disabled?: boolean }) {
  const t = useT();
  return <label className="field">
    <span><T>Work profile</T></span>
    <select aria-label={t('Work profile')} value={value ?? 'generic'} disabled={disabled} onChange={e => onChange(e.target.value as WorkerProfile)}>
      {WORKER_PROFILES.map(p => <option key={p.id} value={p.id}>{t(p.label)}</option>)}
    </select>
  </label>;
}
