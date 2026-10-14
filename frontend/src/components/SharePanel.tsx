import type { ReactNode } from 'react';

// Share options used for invoices and chat transcripts: copy link, device share sheet,
// email app, WhatsApp, download and "open customer view".
export default function SharePanel({ link, title, message, emailTo, emailSubject, signOff, onDownload, notify, extra }: {
  link: string;
  title: string;                 // e.g. "Invoice INV-0007"
  message: string;               // text that goes with the link
  emailTo?: string | null;
  emailSubject: string;
  signOff: string;               // e.g. business name at the end of the email
  onDownload: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;
  extra?: ReactNode;
}) {
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify('Link copied.');
    } catch {
      notify('Could not copy automatically — select the link and press Ctrl+C.', true);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: message, url: link });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) notify('Sharing was cancelled or is not supported here.', true);
    }
  };

  const mailto = `mailto:${emailTo ?? ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
    `${message}\n\nView or download it here:\n${link}\n\nThank you,\n${signOff}`,
  )}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`;

  const download = async () => {
    try { await onDownload(); } catch (e) { notify(e instanceof Error ? e.message : 'Download failed.', true); }
  };

  return (
    <>
      <div className="adm-field">
        <label>Customer link (no login needed)</label>
        <div className="adm-share-link">
          <input className="adm-input" aria-label="Customer link" readOnly value={link} onFocus={e => e.currentTarget.select()} />
          <button type="button" className="adm-btn primary" onClick={() => void copy()} disabled={!link}>Copy</button>
        </div>
      </div>

      <div className="adm-share-grid">
        {canNativeShare && (
          <button type="button" className="adm-share-opt primary" onClick={() => void nativeShare()} disabled={!link}>
            <span className="adm-share-ico">⤴</span>
            <div><strong>Share…</strong><span>Pick any app on this device</span></div>
          </button>
        )}
        <a className="adm-share-opt" href={mailto}>
          <span className="adm-share-ico">@</span>
          <div><strong>Email</strong><span>{emailTo ? `To ${emailTo}` : 'Opens your email app'}</span></div>
        </a>
        <a className="adm-share-opt" href={whatsapp} target="_blank" rel="noreferrer">
          <span className="adm-share-ico">✆</span>
          <div><strong>WhatsApp</strong><span>Send the link in a message</span></div>
        </a>
        <button type="button" className="adm-share-opt" onClick={() => void download()}>
          <span className="adm-share-ico">↓</span>
          <div><strong>Download PDF</strong><span>Print it or attach it yourself</span></div>
        </button>
        <a className="adm-share-opt" href={link} target="_blank" rel="noreferrer">
          <span className="adm-share-ico">↗</span>
          <div><strong>Open customer view</strong><span>See exactly what they'll see</span></div>
        </a>
        {extra}
      </div>
    </>
  );
}
