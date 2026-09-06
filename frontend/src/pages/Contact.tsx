import { openChat } from '../lib/chat';

export default function Contact() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2>Contact us</h2>
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <p><strong>Address:</strong> [ADDRESS]</p>
          <p><strong>Phone:</strong> [PHONE]</p>
          <p><strong>Email:</strong> [EMAIL]</p>
          <p><strong>Hours:</strong> Mon–Fri 8am–5pm · Sat 9am–1pm · Closed Sun</p>
        </div>
        <p className="muted">Have a question about a part? The fastest way to reach us is the chat.</p>
        <button className="btn" onClick={openChat}>Message us</button>
      </div>
    </div>
  );
}