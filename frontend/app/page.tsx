"use client";

import { useRouter } from "next/navigation";

const features = [
  { number: "01", title: "Room booking", description: "Explore available rooms and send booking requests in one simple flow." },
  { number: "02", title: "Clear updates", description: "Keep track of approvals, announcements, messages, and important dates." },
  { number: "03", title: "Simple payments", description: "View your bills and stay on top of upcoming due dates." },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="landing-page">
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <nav className="landing-nav" aria-label="Main navigation">
        <button className="brand-lockup" type="button" onClick={() => router.push("/")} aria-label="UniDorm home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-name">UniDorm<span>.</span></span>
        </button>
        <div className="landing-nav-actions">
          <button type="button" className="landing-link" onClick={() => router.push("/login")}>Sign in</button>
          <button type="button" className="button-primary landing-nav-cta" onClick={() => router.push("/register")}>Create account <span aria-hidden="true">↗</span></button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow-pill"><span className="eyebrow-dot" /> SMART LIVING, SIMPLE STAYS</div>
          <h1>Make room for a <span>better</span> campus life.</h1>
          <p className="landing-lede">A calmer way to manage student accommodation. Find a room, keep track of your booking, and stay connected with your dorm community.</p>
          <div className="landing-actions">
            <button type="button" className="button-primary button-large" onClick={() => router.push("/register")}>Get started <span aria-hidden="true">↗</span></button>
            <button type="button" className="button-secondary button-large" onClick={() => router.push("/login")}>I already have an account</button>
          </div>
          <div className="landing-trust-row">
            <div className="trust-avatars" aria-hidden="true"><span>U</span><span>D</span><span>+</span></div>
            <p><strong>One place for dorm life</strong><span>Bookings · Updates · Payments · Chat</span></p>
          </div>
        </div>

        <div className="landing-visual" aria-label="Preview of the UniDorm dashboard">
          <div className="visual-glow" aria-hidden="true" />
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-window-dots"><i /><i /><i /></div>
              <span>UNIDORM / OVERVIEW</span>
              <span className="preview-live"><i /> LIVE</span>
            </div>
            <div className="preview-content">
              <div className="preview-welcome"><div><span className="preview-kicker">YOUR SPACE, SIMPLIFIED</span><h2>Good morning, Alex</h2><p>Here’s what’s happening with your stay.</p></div><div className="preview-avatar">A</div></div>
              <div className="preview-metrics">
                <div><span className="preview-metric-icon blue">⌂</span><strong>12</strong><small>Rooms available</small><em>Updated today</em></div>
                <div><span className="preview-metric-icon mint">✓</span><strong>08</strong><small>Requests reviewed</small><em>Across the dorm</em></div>
              </div>
              <div className="preview-booking-head"><div><span className="preview-kicker">ROOM SPOTLIGHT</span><h3>Spaces that feel like home</h3></div><span className="preview-arrow">↗</span></div>
              <div className="preview-room-row"><div className="preview-room-art"><div className="room-art-window" /><div className="room-art-bed" /><div className="room-art-plant" /></div><div className="preview-room-info"><strong>Room A · 204</strong><span>Single room · Furnished</span><div><b>฿ 4,500</b><small> / month</small></div></div><span className="preview-available">Available</span></div>
              <div className="preview-progress"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="preview-footer"><span><i /> Your dorm, in sync</span><span>UniDorm platform</span></div>
            </div>
          </div>
          <div className="floating-note floating-note-top"><span className="floating-note-icon">✓</span><span><strong>Easy booking</strong><small>One simple flow</small></span></div>
          <div className="floating-note floating-note-bottom"><span className="floating-note-icon violet">✦</span><span><strong>Stay connected</strong><small>Updates in one place</small></span></div>
        </div>
      </section>

      <section className="landing-features" aria-label="UniDorm features">
        <div className="features-heading"><div><span className="section-kicker">BUILT AROUND YOUR STAY</span><h2>Everything in its right place.</h2></div><p>From your first room search to day-to-day dorm updates, the essentials are easier to find.</p></div>
        <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><span className="feature-number">{feature.number}</span><h3>{feature.title}</h3><p>{feature.description}</p><span className="feature-line" /></article>)}</div>
      </section>
      <footer className="landing-footer"><span>© {new Date().getFullYear()} UniDorm</span><span>Smart booking, simple living.</span></footer>
    </main>
  );
}