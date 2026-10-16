import { Link } from 'react-router-dom';
import { useBusiness } from '../lib/business';
import { usePageTitle } from '../lib/usePageTitle';

export default function About() {
  usePageTitle('About us');
  const { name } = useBusiness();
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <h1>Good parts, second life</h1>
          <p>{name} is a local auto wrecker specialising in quality second-hand car parts.</p>
        </div>
      </section>

      <div className="page-body narrow">
        <div className="panel">
          <p style={{ marginTop: 0, lineHeight: 1.7 }}>We dismantle and test parts from a wide range of makes and models, so you can find affordable, reliable replacements for your vehicle.</p>
          <p style={{ marginBottom: 0, lineHeight: 1.7 }}>Every part is checked before it's listed. Not sure if something fits? Use the <Link to="/finder" style={{ textDecoration: 'underline' }}>car finder</Link> or message us — we're happy to help.</p>
        </div>

        <h2 className="section-title" style={{ marginTop: 36 }}>Why buy from us</h2>
        <ul className="about-list">
          <li><strong>Quality checked</strong><span>Every part is tested and inspected before it's listed.</span></li>
          <li><strong>Better value</strong><span>Affordable prices compared with buying new.</span></li>
          <li><strong>Local team</strong><span>Friendly help, with pickup or delivery.</span></li>
        </ul>
      </div>
    </>
  );
}
