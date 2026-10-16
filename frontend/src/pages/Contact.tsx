import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { phoneHref, useBusiness } from '../lib/business';
import { ensureConversation, openChat, requestHuman, saveChatDetails, sendChatMessage } from '../lib/chat';
import { usePageTitle } from '../lib/usePageTitle';
import { isEmail } from '../lib/format';

export default function Contact() {
  usePageTitle('Contact');
  const business = useBusiness();
  const location = useLocation();
  const requestRef = useRef<HTMLElement>(null);

  // the request is sent to the team as a chat, so they can reply straight away
  const [part, setPart] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'error' | null>(null);
  const [tried, setTried] = useState(false);

  // links to /contact#request jump straight to the form
  useEffect(() => {
    if (location.hash === '#request') requestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!part.trim() || !contact.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const token = await ensureConversation();
      await saveChatDetails(token, name.trim() || null, contact.trim());
      await requestHuman(token);
      const lines = [
        'Part request:',
        `• Part: ${part.trim()}`,
        `• Vehicle: ${vehicle.trim() || 'not given'}`,
        notes.trim() ? `• Notes: ${notes.trim()}` : '',
      ].filter(Boolean);
      await sendChatMessage(token, lines.join('\n'));
      setResult('sent');
      setPart(''); setVehicle(''); setNotes(''); setTried(false);
      openChat();
    } catch {
      setResult('error');
    } finally {
      setSending(false);
    }
  };

  const hoursLines = business.hours.split('·').map(h => h.trim()).filter(Boolean);

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <h1>Talk to the team</h1>
          <p>Questions about a part, pickup or delivery? The chat is the fastest way to reach us.</p>
        </div>
      </section>

      <div className="page-body">
        <div className="contact-grid">
          <aside className="panel accent">
            <h2 className="section-title small">Find us</h2>
            <ul className="contact-list">
              {business.address && <li><span>Address</span>{business.address}</li>}
              {business.phone && <li><span>Phone</span>{phoneHref(business.phone) ? <a href={phoneHref(business.phone)}>{business.phone}</a> : business.phone}</li>}
              {business.email && <li><span>Email</span>{isEmail(business.email) ? <a href={`mailto:${business.email}`}>{business.email}</a> : business.email}</li>}
              {hoursLines.length > 0 && <li><span>Hours</span>{hoursLines.map(line => <div key={line}>{line}</div>)}</li>}
              {business.abn && <li><span>ABN</span>{business.abn}</li>}
            </ul>
            <button className="btn contact-cta" onClick={openChat}>Message us</button>
          </aside>

          <section id="request" ref={requestRef} className="panel">
            <h2 className="section-title small">Request a part</h2>
            <p className="muted panel-intro">Can't find what you need? Tell us the part and your vehicle — we'll check current and upcoming stock and reply in the chat.</p>

            {result === 'sent' && <div className="notice ok">Request sent! Our team will reply in the chat window. Keep your reference code to come back to it later.</div>}
            {result === 'error' && <div className="notice err">Couldn't send your request. Please try again, or use the chat.</div>}

            <form className="request-form" onSubmit={e => void submit(e)} noValidate>
              <div className="field wide">
                <label className="label" htmlFor="req-part">Part you need *</label>
                <input id="req-part" className="input" placeholder="e.g. Left headlight" value={part} onChange={e => setPart(e.target.value)} />
                {tried && !part.trim() && <small className="field-error">Tell us which part you need.</small>}
              </div>
              <div className="field wide">
                <label className="label" htmlFor="req-vehicle">Vehicle (make, model, year)</label>
                <input id="req-vehicle" className="input" placeholder="e.g. Toyota Corolla 2015" value={vehicle} onChange={e => setVehicle(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="req-name">Your name</label>
                <input id="req-name" className="input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="req-contact">Email or phone *</label>
                <input id="req-contact" className="input" placeholder="So we can get back to you" value={contact} onChange={e => setContact(e.target.value)} />
                {tried && !contact.trim() && <small className="field-error">Add an email or phone number.</small>}
              </div>
              <div className="field wide">
                <label className="label" htmlFor="req-notes">Anything else?</label>
                <textarea id="req-notes" className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="wide">
                <button className="btn" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send request'}</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
