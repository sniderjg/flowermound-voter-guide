import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon: '📋',
    title: 'Answer 16 topics',
    desc: 'Rate your stance on issues that matter to Flower Mound residents — from fiscal policy to local development.',
  },
  {
    icon: '⚖️',
    title: 'Set your priorities',
    desc: 'Tell us which issues matter most. The algorithm weighs your strongest preferences more heavily.',
  },
  {
    icon: '🎯',
    title: 'See your matches',
    desc: 'Get a percentage match for every candidate on your November ballot — federal, state, county, and local.',
  },
]

const RACES = [
  { level: 'Federal', icon: '🇺🇸', races: 'US Senate · US House TX-26' },
  { level: 'Statewide', icon: '⭐', races: 'Governor · AG · Comptroller · Lt. Gov · Land Commissioner · Agriculture · Railroad Commission' },
  { level: 'State Legislature', icon: '🏛️', races: 'TX Senate SD-12 · TX House HD-63' },
  { level: 'County', icon: '🏢', races: 'Denton County Judge · Commissioner · DA · Sheriff' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a6e 0%, #1a56a4 60%, #2d72d2 100%)',
        color: '#fff',
        padding: '4rem 1.5rem',
        textAlign: 'center',
      }}>
        <div className="container">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗳️</div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem, 5vw, 3rem)', marginBottom: '1rem' }}>
            Know Your Candidates.<br />Not Just Their Party.
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: .9, maxWidth: 540, margin: '0 auto 2rem' }}>
            Answer questions on the issues that matter to you. We'll match you with
            every candidate on your November 2026 Flower Mound ballot — based on
            positions, not party labels.
          </p>
          <button
            className="btn btn--lg"
            style={{ background: '#fff', color: 'var(--blue)', fontWeight: 700 }}
            onClick={() => navigate('/quiz')}
          >
            Start the Quiz →
          </button>
          <p style={{ marginTop: '1rem', fontSize: '.85rem', opacity: .7 }}>
            Takes about 10–15 minutes · Completely anonymous
          </p>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '3rem 1.5rem', background: '#fff' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>{f.icon}</div>
                <h3 style={{ marginBottom: '.5rem' }}>{f.title}</h3>
                <p className="text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What's on the ballot */}
      <div style={{ padding: '3rem 1.5rem', background: 'var(--gray-50)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '.5rem' }}>What's on your November ballot</h2>
          <p className="text-muted text-center" style={{ marginBottom: '2rem' }}>
            Flower Mound voters in Denton County will see races at every level of government.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {RACES.map((r, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: '1.75rem', marginBottom: '.5rem' }}>{r.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: '.25rem', color: 'var(--text-h)' }}>{r.level}</div>
                <div className="text-muted text-sm">{r.races}</div>
              </div>
            ))}
          </div>
          <div className="alert alert--info mt-3">
            <strong>Note:</strong> Flower Mound Town Council and LISD Board races were held in May 2026.
            This guide covers the November 2026 general election.
          </div>
        </div>
      </div>

      {/* Non-partisan disclaimer */}
      <div style={{ padding: '2.5rem 1.5rem', background: '#fff', borderTop: '1px solid var(--border)' }}>
        <div className="container text-center">
          <h3 style={{ marginBottom: '.75rem' }}>100% Non-Partisan</h3>
          <p className="text-muted" style={{ maxWidth: 560, margin: '0 auto 1.5rem' }}>
            This guide is built by Flower Mound residents for Flower Mound residents.
            We don't endorse any candidate or party. Questions are designed so that
            someone from any political background would find them fair. Candidate
            positions are researched from public sources — voting records, campaign
            websites, and news coverage.
          </p>
          <button
            className="btn btn--primary btn--lg"
            onClick={() => navigate('/quiz')}
          >
            Start the Quiz →
          </button>
        </div>
      </div>
    </div>
  )
}
