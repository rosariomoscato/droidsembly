// Persistent creation feedback beside the form, including the next explicit action.
import { useEffect, useRef } from 'react';
import type { RepoView } from '../../../shared/types';
import { useT } from '../i18n';

export function ProjectCreationNotice({ pendingName, error, repo, onOpen, onAnother }: {
  pendingName?: string;
  error?: string;
  repo?: Pick<RepoView, 'id' | 'fullName' | 'appStarter'>;
  onOpen?: () => void;
  onAnother?: () => void;
}) {
  const t = useT();
  const notice = useRef<HTMLElement>(null);
  useEffect(() => { if (repo) notice.current?.focus(); }, [repo?.id]);
  if (!pendingName && !error && !repo) return null;
  return <section ref={notice} className="project-creation-notice" role={error ? 'alert' : 'status'} tabIndex={repo ? -1 : undefined}>
    {pendingName && <><strong>{t('Creating project {name}…', { name: pendingName })}</strong><p>{t('Please wait. Do not submit the request again.')}</p></>}
    {error && <><strong>{t('Project creation was not confirmed.')}</strong><p>{error}</p><p>{t('Check the project list before retrying; the request may already have completed.')}</p></>}
    {repo && <>
      <strong>{t('Project created: {name}', { name: repo.fullName })}</strong>
      <p>{t(repo.appStarter ? 'Next: answer the CEO interview. No plan issues or workers start before you approve the plan.' : 'The project is now in the office.')}</p>
      <div className="row">
        <button type="button" className="btn btn-good" onClick={onOpen}>{t(repo.appStarter ? 'Open project interview' : 'View project')}</button>
        <button type="button" className="btn btn-ghost" onClick={onAnother}>{t('Create another project')}</button>
      </div>
    </>}
  </section>;
}
