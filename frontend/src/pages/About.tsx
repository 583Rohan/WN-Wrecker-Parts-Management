import { useBusiness } from '../lib/business';

export default function About() {
  const { name } = useBusiness();
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2>About {name}</h2>
        <p>{name} is a local auto wrecker specialising in quality second-hand car parts. We dismantle and test parts from a wide range of makes and models, so you can find affordable, reliable replacements for your vehicle.</p>
        <p>Every part is checked before it's listed. Not sure if something fits? Use the car finder or message us — we're happy to help.</p>
        <h3>Why buy from us</h3>
        <ul className="muted"><li>Tested, quality-checked parts</li><li>Affordable prices vs buying new</li><li>Friendly local team, pickup or delivery</li></ul>
      </div>
    </div>
  );
}
