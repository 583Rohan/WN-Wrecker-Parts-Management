import { Link } from "react-router-dom";
import { hasEmail, phoneHref, useBusiness } from "../lib/business";
import { CarIcon, ChatIcon, CheckIcon, RecycleIcon } from "./Icons";

const footerStyles = `
  .wn-site-footer {
    --wn-footer-navy: var(--c-navy);
    --wn-footer-deep: var(--c-navy-deep);
    --wn-footer-ink: #f5f6f3;
    --wn-footer-muted: #9fa9b7;
    --wn-footer-amber: var(--c-amber);
    width: 100%;
    margin: 0;
    padding: 0;
    color: var(--wn-footer-ink);
    background: var(--wn-footer-deep);
    font-family: var(--font-body);
  }
  .wn-site-footer * { box-sizing: border-box; }
  .wn-site-footer a { color: inherit; text-decoration: none; }
  .wn-footer-help {
    padding: 34px clamp(24px, 5vw, 92px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    color: #111;
    background: var(--wn-footer-amber);
  }
  .wn-footer-help h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.8rem); font-weight: 500; line-height: 1; text-transform: uppercase; }
  .wn-footer-help a { min-height: 48px; padding: 0 20px; display: inline-flex; align-items: center; white-space: nowrap; color: #fff; background: var(--c-navy-deep); font-size: 0.8rem; font-weight: 800; transition: transform 180ms ease, background 180ms ease; }
  .wn-footer-help a:hover { transform: translateY(-2px); background: #000; }
  .wn-footer-benefits {
    padding: 0 clamp(24px, 5vw, 92px);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    background: var(--wn-footer-navy);
    border-bottom: 1px solid rgba(255,255,255,0.09);
  }
  .wn-footer-benefit { min-height: 92px; padding: 22px 24px; display: flex; align-items: center; gap: 13px; border-right: 1px solid rgba(255,255,255,0.09); }
  .wn-footer-benefit:first-child { padding-left: 0; }
  .wn-footer-benefit:last-child { border-right: 0; }
  .wn-footer-benefit > span svg { width: 17px; height: 17px; }
  .wn-footer-benefit > span { width: 31px; height: 31px; flex: 0 0 auto; display: grid; place-items: center; color: #111; background: var(--wn-footer-amber); border-radius: 50%; font-size: 0.75rem; font-weight: 900; }
  .wn-footer-benefit div { display: grid; gap: 3px; }
  .wn-footer-benefit strong { font-size: 0.77rem; }
  .wn-footer-benefit small { color: var(--wn-footer-muted); font-size: 0.68rem; line-height: 1.4; }
  .wn-footer-main {
    padding: 58px clamp(24px, 5vw, 92px) 50px;
    display: grid;
    grid-template-columns: minmax(260px, 1.35fr) repeat(3, minmax(150px, 0.65fr));
    gap: clamp(34px, 5vw, 74px);
    background: var(--wn-footer-navy);
  }
  .wn-footer-brand { max-width: 340px; }
  .wn-footer-logo { display: inline-flex; align-items: center; font-size: 1.65rem; font-weight: 900; letter-spacing: -0.045em; }
  .wn-footer-logo strong { color: #fff; }
  .wn-footer-logo span { color: var(--wn-footer-amber); }
  .wn-footer-brand > p { margin: 19px 0 25px; color: var(--wn-footer-muted); line-height: 1.65; }
  .wn-footer-recycle { display: inline-flex; align-items: center; gap: 9px; color: #d9dee5; font-size: 0.75rem; font-weight: 700; }
  .wn-footer-recycle span { color: var(--wn-footer-amber); font-size: 1.15rem; }
  .wn-footer-column h3 { margin: 5px 0 16px; color: #fff; font-size: 0.92rem; font-weight: 700; }
  .wn-footer-column ul { margin: 0; padding: 0; display: grid; gap: 12px; list-style: none; }
  .wn-footer-column li, .wn-footer-column a { color: var(--wn-footer-muted); font-size: 0.8rem; line-height: 1.45; }
  .wn-footer-column a:hover { color: var(--wn-footer-amber); }
  .wn-footer-column .wn-footer-email { color: #fff; text-decoration: underline; text-decoration-color: var(--wn-footer-amber); text-underline-offset: 4px; overflow-wrap: anywhere; }
  .wn-footer-acknowledgement { margin: 0 clamp(24px, 5vw, 92px); padding: 24px 0; color: #adb5c0; border-top: 1px solid rgba(255,255,255,0.09); border-bottom: 1px solid rgba(255,255,255,0.09); font-size: 0.75rem; line-height: 1.65; text-align: center; }
  .wn-footer-bottom { padding: 24px clamp(24px, 5vw, 92px) 30px; display: flex; justify-content: space-between; gap: 24px; color: #7f8997; font-size: 0.7rem; line-height: 1.55; }
  .wn-footer-bottom p { margin: 0; }
  .wn-footer-bottom p:last-child { max-width: 620px; text-align: right; }
  @media (max-width: 900px) {
    .wn-footer-benefits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wn-footer-benefit:nth-child(2) { border-right: 0; }
    .wn-footer-benefit:nth-child(-n+2) { border-bottom: 1px solid rgba(255,255,255,0.09); }
    .wn-footer-main { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 620px) {
    .wn-footer-help { align-items: flex-start; flex-direction: column; }
    /* the four benefits sit two by two so they don't fill the screen */
    .wn-footer-benefits { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 6px 20px; }
    .wn-footer-benefit, .wn-footer-benefit:first-child { min-height: 0; padding: 14px 10px 14px 0; gap: 10px; align-items: flex-start; border-right: 0; }
    .wn-footer-benefit > span { width: 26px; height: 26px; font-size: 0.65rem; }
    .wn-footer-main { padding: 36px 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 20px; }
    .wn-footer-brand, .wn-footer-main > .wn-footer-column:last-child { grid-column: 1 / -1; }   /* link lists sit side by side */
    .wn-footer-acknowledgement { margin: 0 20px; text-align: left; }
    .wn-footer-bottom { padding: 22px 20px 88px; flex-direction: column; }   /* room for the chat button */
    .wn-footer-bottom p:last-child { text-align: left; }
  }
`;

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const business = useBusiness();   // name, email, phone, hours come from appsettings.json → "Business"
  const hoursLines = business.hours.split("·").map(h => h.trim()).filter(Boolean);

  return (
    <>
      <style>{footerStyles}</style>
      <footer className="wn-site-footer">
        <section className="wn-footer-help" aria-labelledby="wn-footer-help-title">
          <div>
            <h2 id="wn-footer-help-title">Give us the vehicle details—we’ll do the searching.</h2>
          </div>
          <Link to="/contact#request">Request a part</Link>
        </section>

        <section className="wn-footer-benefits" aria-label="Why choose WN Wrecker">
          <div className="wn-footer-benefit"><span><CheckIcon /></span><div><strong>Quality checked</strong><small>Parts inspected before listing</small></div></div>
          <div className="wn-footer-benefit"><span><CarIcon /></span><div><strong>Vehicle matching</strong><small>Help finding compatible parts</small></div></div>
          <div className="wn-footer-benefit"><span><ChatIcon /></span><div><strong>Direct enquiries</strong><small>Speak with the parts team</small></div></div>
          <div className="wn-footer-benefit"><span><RecycleIcon /></span><div><strong>Reuse first</strong><small>Giving good parts another life</small></div></div>
        </section>

        <div className="wn-footer-main">
          <div className="wn-footer-brand">
            <Link className="wn-footer-logo" to="/" aria-label="WN Wrecker home"><strong>WN</strong><span>Wrecker</span></Link>
            <p>Quality second-hand automotive parts, carefully dismantled and ready for their next chapter.</p>
            <div className="wn-footer-recycle"><span aria-hidden="true">♻</span> Responsible automotive recycling</div>
          </div>

          <nav className="wn-footer-column" aria-label="Shop links">
            <h3>Find parts</h3>
            <ul>
              <li><Link to="/parts">Browse inventory</Link></li>
              <li><Link to="/finder">Car finder</Link></li>
              <li><Link to="/cart">Your cart</Link></li>
            </ul>
          </nav>

          <nav className="wn-footer-column" aria-label="Company links">
            <h3>WN Wrecker</h3>
            <ul>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/contact">Contact the team</Link></li>
              <li><Link to="/contact#request">Request a part</Link></li>
            </ul>
          </nav>

          <div className="wn-footer-column">
            <h3>Contact and hours</h3>
            <ul>
              {hasEmail(business.email)
                ? <li><a className="wn-footer-email" href={`mailto:${business.email}`}>{business.email}</a></li>
                : business.email && <li>{business.email}</li>}
              {phoneHref(business.phone)
                ? <li><a href={phoneHref(business.phone)}>{business.phone}</a></li>
                : business.phone && <li>{business.phone}</li>}
              {hoursLines.map(line => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </div>

        <p className="wn-footer-acknowledgement">
          WN Wrecker acknowledges the Traditional Custodians of Country throughout Australia and recognises their continuing connection to land, waters and communities. We pay our respects to Elders past and present.
        </p>

        <div className="wn-footer-bottom">
          <p>© {currentYear} {business.name}. All rights reserved.</p>
          <p>Part compatibility and condition should be confirmed with our team before purchase. Product availability may change without notice.</p>
        </div>
      </footer>
    </>
  );
}
