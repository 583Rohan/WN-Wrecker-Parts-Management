import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ToastState } from '../lib/admin';

// open popups, newest last — Escape only closes the top one
const openModals: number[] = [];
let modalSeq = 0;

// Reusable popup window used across the admin pages (rendered on top of the page, so popups can stack)
export function Modal({ title, subtitle, onClose, children, footer, wide }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const id = ++modalSeq;
    openModals.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = openModals.indexOf(id);
      if (i >= 0) openModals.splice(i, 1);
    };
  }, []);

  return createPortal(
    <div className="adm adm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`adm-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="adm-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="adm-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// Yes/No confirmation popup (e.g. before deleting)
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="adm-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`adm-btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// Small auto-dismissing message in the bottom-right corner
export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return createPortal(
    <div className={`adm adm-toast${toast.error ? ' error' : ''}`} role="status">
      <span className="adm-toast-mark">{toast.error ? '!' : '✓'}</span>
      <span>{toast.text}</span>
    </div>,
    document.body,
  );
}

// Image that shows a "No photo" box if the link is missing or broken
export function SafeImg({ src, className, fallbackClass, alt = '' }: {
  src?: string | null;
  className: string;
  fallbackClass: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={fallbackClass}>No photo</span>;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
