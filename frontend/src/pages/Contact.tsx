import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { hasEmail, phoneHref, useBusiness } from '../lib/business';
import { ensureConversation, openChat, requestHuman, saveChatDetails, sendChatMessage } from '../lib/chat';

export default function Contact() {
  const business = useBusiness();   // all details come from appsettings.json → "Business"
  const location = useLocation();
  const requestRef = useRef<HTMLElement>(null);

  // part request form — sent to the team as a chat, so they can reply straight away
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
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h2>Contact us</h2>
        <div className="card card-body" style={{ marginBottom: 20 }}>
          {business.address && <p><strong>Address:</strong> {business.address}</p>}
          {business.phone && <p><strong>Phone:</strong> {phoneHref(business.phone) ? <a href={phoneHref(business.phone)}>{business.phone}</a> : business.phone}</p>}
          {business.email && <p><strong>Email:</strong> {hasEmail(business.email) ? <a href={`mailto:${business.email}`}>{business.email}</a> : business.email}</p>}
          {hoursLines.length > 0 && <p><strong>Hours:</strong> {hoursLines.join(' · ')}</p>}
          {business.abn && <p className="muted" style={{ fontSize: 13 }}>ABN {business.abn}</p>}
        </div>
        <p className="muted">Have a question about a part? The fastest way to reach us is the chat.</p>
        <button className="btn" onClick={openChat}>Message us</button>

        <section id="request" ref={requestRef} className="card card-body" style={{ marginTop: 32, scrollMarginTop: 80 }}>
          <h3 style={{ marginTop: 0 }}>Request a part</h3>
          <p className="muted" style={{ marginTop: 0 }}>Can't find what you need? Tell us the part and your vehicle — we'll check current and upcoming stock and reply in the chat.</p>

          {result === 'sent' && <div className="notice ok">Request sent! Our team will reply in the chat window. Keep your reference code to come back to it later.</div>}
          {result === 'error' && <div className="notice err">Couldn't send your request. Please try again, or use the chat.</div>}

          <form className="request-form" onSubmit={e => void submit(e)} noValidate>
            <div className="field wide">
              <label className="label" htmlFor="req-part">Part you need *</label>
              <input id="req-part" className="input" placeholder="e.g. Left headlight" value={part} onChange={e => setPart(e.target.value)} />
              {tried && !part.trim() && <small style={{ color: '#b91c1c' }}>Tell us which part you need.</small>}
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
              {tried && !contact.trim() && <small style={{ color: '#b91c1c' }}>Add an email or phone number.</small>}
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
  );
}
