import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore, type Agent } from '../store';
import { T, useT } from '../i18n';
import type { OpenCodeConnections as Connections, OpenCodeConnectionAction } from '../../../shared/opencodeConnections';
import { confirmDialog } from './Confirm';

/** Metadata is fetched only on expansion, and always from this agent's host. */
export function OpenCodeConnections({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false);
  return <div className="card">
    <button type="button" className="btn btn-small" aria-expanded={open} onClick={() => setOpen(!open)}><T>OpenCode connections</T></button>
    {open && <ConnectionChoices key={`${agent.id}:${agent.host}`} agent={agent} />}
  </div>;
}

function ConnectionChoices({ agent }: { agent: Agent }) {
  const t = useT();
  const [catalog, setCatalog] = useState<Connections | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [provider, setProvider] = useState('');
  const [method, setMethod] = useState('');
  const [account, setAccount] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalog(null);
    setError('');
    void api.openCodeConnections(agent.id).then(data => {
      if (active) setCatalog(data);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : t('Could not load connections.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [agent.id, refresh, t]);
  const integration = catalog?.integrations.find(i => i.id === provider);
  const selectedMethod = integration?.methods.find(m => m.id === method);
  const selectedAccount = integration?.connections.find(c => c.id === account);
  const locked = loading || pending || !!catalog?.configuringAgent;
  const openTerminal = () => useStore.getState().openOverlay({ kind: 'terminal', agentId: agent.id });
  const apply = async (action: OpenCodeConnectionAction) => {
    const local = catalog?.scope === 'local';
    if (!await confirmDialog({ title: t('Change OpenCode connection?'), body: t(local
      ? 'This changes the shared OpenCode account on this computer, not just this agent. Stop all work and close coding-agent terminals first. Continue?'
      : 'This changes OpenCode accounts in this Box only. Stop all work and close coding-agent terminals first. Continue?'), confirm: t('Continue') })) return;
    setPending(true);
    setNotice('');
    try {
      if (!catalog) return;
      await api.configureOpenCode(agent.id, action, catalog.scopeKey);
      setNotice(t('Authentication started in the terminal. Finish there, then refresh connections. Selection alone does not activate an account.'));
      openTerminal();
      setRefresh(n => n + 1);
    } catch { /* API already reports the error. */ }
    finally { setPending(false); }
  };
  return <div>
    <p className="muted small"><T>Choose a provider and authentication method, or activate a saved account. Credentials are entered only in OpenCode’s official terminal flow, never in these fields.</T></p>
    <p className="muted small">{catalog?.scope === 'box' || agent.host === 'box'
      ? <T>Scope: this Box. Other Boxes and this computer are separate. Using the same subscription still shares its usage limits.</T>
      : <T>Scope: shared OpenCode environment on this computer, including other local agents. No per-agent account isolation.</T>}</p>
    <p className="muted small"><T>API keys use provider API billing. OAuth may use a subscription only when the provider supports it; check the method and provider terms.</T></p>
    <button className="btn btn-small" type="button" disabled={loading || pending} onClick={() => setRefresh(n => n + 1)}><T>Refresh connections</T></button>
    {loading && <p role="status"><T>Loading connections…</T></p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {catalog?.configuringAgent && <p role="status"><T>OpenCode authentication is running. Finish in its terminal or stop the connection operation.</T></p>}
    {catalog?.configuringAgent === agent.id && <>
      <button type="button" className="btn btn-small" onClick={openTerminal}><T>Open terminal</T></button>
      <button type="button" className="btn btn-small" disabled={pending} onClick={async () => {
        setPending(true);
        try { await api.cancelOpenCodeConfiguration(agent.id); setRefresh(n => n + 1); }
        catch { /* API already reports the error. */ }
        finally { setPending(false); }
      }}><T>Stop connection operation</T></button>
    </>}
    {catalog && <>
      <label className="field"><span><T>Provider</T></span>
        <select value={integration ? provider : ''} disabled={locked} onChange={e => { setProvider(e.target.value); setMethod(''); setAccount(''); }}>
          <option value="">{t('Select a provider')}</option>
          {catalog.integrations.map(i => <option key={i.id} value={i.id}>{i.name} — {i.id}</option>)}
        </select>
      </label>
      {integration && <>
        <label className="field"><span><T>Authentication method</T></span>
          <select disabled={locked} value={selectedMethod ? method : ''} onChange={e => setMethod(e.target.value)}>
            <option value="">{t('Select an authentication method')}</option>
            {integration.methods.map(m => <option key={m.id} value={m.id}>{m.label} — {m.type}</option>)}
          </select>
        </label>
        {selectedMethod?.type === 'env' && <p className="muted small"><T>Environment credentials are managed on this host, not saved or copied by the app. Use the provider’s official setup instructions.</T></p>}
        <button type="button" className="btn btn-small" disabled={locked || !selectedMethod || selectedMethod.type === 'env'} onClick={() => void apply({ action: 'login', integration: integration.id, method })}><T>Add account in terminal</T></button>
        <label className="field"><span><T>Saved account / profile</T></span>
          <select disabled={locked} value={selectedAccount ? account : ''} onChange={e => setAccount(e.target.value)}>
            <option value="">{t('Select an account')}</option>
            {integration.connections.map(c => <option key={c.id} value={c.id} disabled={c.environment}>{c.label} — {c.method}{c.needsAuth ? ` (${t('needs sign-in')})` : ''}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-small" disabled={locked || !selectedAccount || selectedAccount.environment} onClick={() => void apply({ action: 'switch', integration: integration.id, account })}><T>Activate account in terminal</T></button>
        <p className="muted small"><T>The public API lists saved accounts but does not identify the active one. Verify the active account with OpenCode auth list. Accounts persist in OpenCode on this host, not as an app preference.</T></p>
      </>}
    </>}
  </div>;
}
