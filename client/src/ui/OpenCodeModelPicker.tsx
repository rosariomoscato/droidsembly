import { useEffect, useId, useMemo, useState } from 'react';
import { T, useT } from '../i18n';
import { api } from '../api';
import { searchOpenCodeModels, withOpenCodeVariant, type OpenCodeCatalog } from '../../../shared/opencodeModels';
import type { CSSProperties } from 'react';

/** Fetch only when expanded. Native controls avoid nested modal focus traps. */
export function OpenCodeModelPicker({ value, onSelect, agent, repo, disabled, inherited }: {
  value: string; onSelect: (model: string) => void; agent?: string; repo?: string; disabled?: boolean; inherited?: string;
}) {
  const [open, setOpen] = useState(false);
  return <span style={{ display: 'inline-block', maxWidth: '100%' }}>
    <button type="button" className="btn btn-small" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}><T>Browse OpenCode models</T></button>
    <span className="muted small" style={{ display: 'block', overflowWrap: 'anywhere' }}><T>Selected:</T> {value || inherited || <T>OpenCode default</T>}</span>
    {open && !disabled && <ModelChoices key={`${agent}:${repo}`} value={value} agent={agent} repo={repo} inherited={inherited} onSelect={(model) => { onSelect(model); setOpen(false); }} />}
  </span>;
}
function ModelChoices({ value, onSelect, agent, repo, inherited }: {
  value: string; onSelect: (model: string) => void; agent?: string; repo?: string; inherited?: string;
}) {
  const id = useId();
  const t = useT();
  const [catalog, setCatalog] = useState<OpenCodeCatalog | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('');
  const [chosen, setChosen] = useState(value.split('#')[0]);
  const [variant, setVariant] = useState(value.split('#')[1] ?? '');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api.openCodeModels({ ...(agent ? { agent } : {}), ...(repo ? { repo } : {}) }, refresh > 0)
      .then((data) => { if (active) setCatalog(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load models'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [agent, repo, refresh]);
  const models = useMemo(() => searchOpenCodeModels(catalog?.models ?? [], query, provider), [catalog, query, provider]);
  const selected = catalog?.models.find((m) => m.id === chosen);
  const providers = [...new Set(catalog?.models.map((m) => m.provider))];
  return <span className="card" style={{ display: 'block', marginTop: 8, minWidth: 220 }}>
    <span className="muted small" style={{ display: 'block' }}><T>Choose a model and variant, then press “Use model” to save. Changes apply to the next task. Manual entry remains available.</T></span>
    {catalog && <span className="muted small" style={{ display: 'block', overflowWrap: 'anywhere' }}>Project: {catalog.directory}</span>}
    <button type="button" className="btn btn-small" onClick={() => onSelect('')}>{inherited ? `Office default (${inherited})` : `OpenCode default${catalog?.defaultModel ? ` (${catalog.defaultModel})` : ''}`}</button>
    <button type="button" className="btn btn-small" disabled={loading} onClick={() => setRefresh((n) => n + 1)}><T>Refresh</T></button>
    {loading && <span role="status"><T>Loading models…</T></span>}
    {error && <span role="alert">{error}</span>}
    {catalog && <>
      <span className="field"><T>Search models</T></span>
      <input id={`${id}-search`} aria-label={t('Search OpenCode models')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <span className="field"><T>Provider</T></span>
      <select id={`${id}-provider`} aria-label={t('OpenCode provider')} value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="">{t('All providers')}</option>{providers.map((p) => <option key={p}>{p}</option>)}
      </select>
      <span className="field">{t('Available models ({count})', { count: models.length })}</span>
      <select id={`${id}-model`} aria-label={t('Available OpenCode models')} value={models.some((m) => m.id === chosen) ? chosen : ''} onChange={(e) => { setChosen(e.target.value); setVariant(''); }}>
        <option value="">{t('Select a model')}</option>
        {models.map((m) => <option key={m.id} value={m.id} disabled={!m.tools}>{m.name} — {m.id}{!m.tools ? ' (no tools)' : ''}</option>)}
      </select>
      {!models.length && <span role="status"><T>No matching models.</T></span>}
      <span className="field"><T>Variant</T></span>
      <select id={`${id}-variant`} aria-label={t('OpenCode variant')} value={variant} disabled={!selected?.variants.length} onChange={(e) => setVariant(e.target.value)}>
        <option value="">{t('Model default')}</option>{selected?.variants.map((v) => <option key={v}>{v}</option>)}
      </select>
      <button type="button" className="btn btn-small" disabled={loading || !selected?.tools || !models.some((m) => m.id === chosen) || (!!variant && !selected.variants.includes(variant))} onClick={() => onSelect(chosen + (variant ? `#${variant}` : ''))}><T>Use model</T></button>
    </>}
  </span>;
}

/** OpenCode reasoning comes from the model variant, never the stale Claude effort field. */
export function OpenCodeVariantSelect({ value, inherited, agent, repo, onSelect, id, style, disabled }: {
  value: string; inherited?: string; agent?: string; repo?: string; onSelect: (model: string) => void;
  id?: string; style?: CSSProperties; disabled?: boolean;
}) {
  const [catalog, setCatalog] = useState<OpenCodeCatalog | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (disabled) return;
    let active = true;
    void api.openCodeModels({ ...(agent ? { agent } : {}), ...(repo ? { repo } : {}) })
      .then((data) => { if (active) { setCatalog(data); setError(''); } })
      .catch(() => { if (active) setError('Could not load variants; use Browse OpenCode models to refresh or enter #variant manually.'); });
    return () => { active = false; };
  }, [agent, repo, disabled]);
  const effective = value || inherited || catalog?.defaultModel || '';
  const [base, variant = ''] = effective.split('#');
  const variants = catalog?.models.find((m) => m.id === base)?.variants ?? [];
  return <select id={id} aria-label={id ? undefined : 'OpenCode variant'} style={style} value={variant}
    disabled={disabled || !variants.length} title={error || (variants.length ? 'OpenCode reasoning variant; applies to the next task' : catalog ? 'No variants available for this model; manual #variant entry remains available' : 'Loading OpenCode variants…')}
    onChange={(e) => onSelect(withOpenCodeVariant(effective, e.target.value))}>
    <option value="">{catalog ? 'model default' : 'loading variants…'}</option>
    {variant && !variants.includes(variant) && <option value={variant}>{variant}</option>}
    {variants.map((v) => <option key={v} value={v}>{v}</option>)}
  </select>;
}
