import { Link } from "react-router-dom";
import { phoneHref, useBusiness } from "../lib/business";
import { isEmail } from "../lib/format";
import { CarIcon, ChatIcon, CheckIcon, RecycleIcon } from "./Icons";
import "../styles/footer.css";

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const business = useBusiness();
  const hoursLines = business.hours.split("·").map(h => h.trim()).filter(Boolean);

  return (
    <>
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
              {isEmail(business.email)
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
