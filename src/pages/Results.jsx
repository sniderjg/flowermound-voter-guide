import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import candidatesData from '../data/candidates.json'
import { matchVoterToCandidates, formatMatchForDisplay } from '../matcher.js'

const LEVEL_LABELS = {
  federal: 'Federal',
  statewide: 'Statewide',
  state_legislature: 'State Legislature',
  county: 'County',
  local: 'Local',
}

const LEVEL_ORDER = ['federal', 'statewide', 'state_legislature', 'county', 'local']

const PARTY_SHORT = {
  Republican: 'R', Democrat: 'D', Libertarian: 'L', Independent: 'I', Green: 'G',
}

function getPartyBadge(party) {
  const short = PARTY_SHORT[party] || party.charAt(0)
  const cls = party === 'Republican' ? 'r' : party === 'Democrat' ? 'd' : party === 'Libertarian' ? 'l' : 'i'
  return <span className={`badge badge--${cls}`}>{short} {party}</span>
}

function getMatchColor(pct) {
  if (pct >= 70) return 'high'
  if (pct >= 50) return 'mid'
  return 'low'
}

export default function Results() {
  const navigate = useNavigate()

  const voterAnswers = useMemo(() => {
    const raw = sessionStorage.getItem('voterAnswers')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }, [])

  const matchResult = useMemo(() => {
    if (!voterAnswers) return null
    // Normalize profiles: matcher expects candidate.name but JSON uses candidate_name
    const candidates = (candidatesData.profiles ?? []).map(p => ({
      ...p,
      name: p.candidate_name ?? p.name,
    }))
    try {
      return matchVoterToCandidates(voterAnswers, candidates)
    } catch (err) {
      console.error('Matching error:', err)
      return { error: err.message }
    }
  }, [voterAnswers])

  if (matchResult?.error) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2>Something went wrong</h2>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>{matchResult.error}</p>
          <button className="btn btn--primary w-full" onClick={() => navigate('/quiz')}>Retake quiz →</button>
        </div>
      </div>
    )
  }

  if (!voterAnswers) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤔</div>
          <h2>No quiz answers found</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            It looks like you haven't taken the quiz yet — or your answers were cleared.
          </p>
          <button className="btn btn--primary w-full" onClick={() => navigate('/quiz')}>
            Take the quiz →
          </button>
        </div>
      </div>
    )
  }

  if (matchResult?.voterSkippedAll) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2>Not enough answers</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            You skipped all the questions. Please answer at least a few to get matches.
          </p>
          <button className="btn btn--primary w-full" onClick={() => navigate('/quiz')}>
            Retake quiz →
          </button>
        </div>
      </div>
    )
  }

  // Group races by level
  const racesByLevel = {}
  for (const race of matchResult?.races ?? []) {
    const lvl = race.level
    if (!racesByLevel[lvl]) racesByLevel[lvl] = []
    racesByLevel[lvl].push(race)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'var(--blue)', color: '#fff', padding: '2.5rem 1.5rem' }}>
        <div className="container text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🎯</div>
          <h1 style={{ color: '#fff', fontSize: '1.75rem', marginBottom: '.5rem' }}>
            Your Candidate Matches
          </h1>
          <p style={{ opacity: .85 }}>
            Based on your quiz answers, here's how you align with every candidate on your November 2026 ballot.
          </p>
          <button
            className="btn btn--sm"
            style={{ marginTop: '1rem', background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
            onClick={() => navigate('/quiz')}
          >
            ← Retake quiz
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: 'var(--gold-pale)', borderBottom: '1px solid #f0d080', padding: '.75rem 1.5rem' }}>
        <div className="container text-center">
          <span className="text-sm" style={{ color: '#7a5c00' }}>
            <strong>Non-partisan:</strong> Candidate positions are researched from public sources.
            Match % reflects alignment on policy positions — not an endorsement of any candidate.
          </span>
        </div>
      </div>

      {/* Race sections */}
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        {LEVEL_ORDER.map(level => {
          const races = racesByLevel[level]
          if (!races?.length) return null
          return (
            <div key={level} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '.5rem', marginBottom: '1.5rem' }}>
                {LEVEL_LABELS[level]}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {races.map(race => <RaceCard key={race.race} race={race} />)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer CTA */}
      <div style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '2rem 1.5rem' }}>
        <div className="container text-center">
          <h3 style={{ marginBottom: '.75rem' }}>Want to learn more about a candidate?</h3>
          <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
            Click any candidate card above to see their full positions, sources, and confidence ratings.
          </p>
          <button className="btn btn--secondary" onClick={() => navigate('/quiz')}>
            ← Adjust my answers
          </button>
        </div>
      </div>
    </div>
  )
}

function RaceCard({ race }) {
  // Sort by match descending
  const sorted = [...race.candidates].sort((a, b) => b.matchPercent - a.matchPercent)
  const winner = sorted[0]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{race.race}</h3>
        {winner && (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Top match: <strong style={{ color: 'var(--text-h)' }}>{winner.name}</strong> ({Math.round(winner.matchPercent)}%)
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {sorted.map((c, i) => <CandidateRow key={c.name} candidate={c} rank={i} />)}
      </div>
    </div>
  )
}

function CandidateRow({ candidate, rank }) {
  const pct = Math.round(candidate.matchPercent)
  const colorClass = getMatchColor(pct)
  const formatted = formatMatchForDisplay(candidate)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '.5rem',
      padding: '.875rem', borderRadius: 8,
      background: rank === 0 ? 'var(--blue-pale)' : 'var(--gray-50)',
      border: `1px solid ${rank === 0 ? '#c3d9f8' : 'var(--border)'}`,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Link to={`/candidate/${encodeURIComponent(candidate.name)}`} style={{ fontWeight: 700, color: 'var(--text-h)' }}>
            {candidate.name}
          </Link>
          {candidate.incumbent && <span className="text-sm text-muted"> · Incumbent</span>}
          <div style={{ marginTop: '.2rem' }}>
            {getPartyBadge(candidate.party)}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <div style={{
            fontSize: '1.5rem', fontWeight: 800,
            color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--blue)' : 'var(--gray-500)',
          }}>
            {pct}%
          </div>
          <div className="text-muted text-sm">match</div>
        </div>
      </div>

      {/* Match bar */}
      <div className="match-meter">
        <div className={`match-meter__fill match-meter__fill--${colorClass}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Top drivers */}
      {formatted.topTopics?.length > 0 && (
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
          {formatted.topTopics.map(t => (
            <span key={t.topicId} style={{
              fontSize: '.75rem', padding: '.2rem .55rem', borderRadius: 999,
              background: t.netPositive ? '#e6f4ec' : '#fdecea',
              color: t.netPositive ? '#1a7a4a' : '#c0392b',
            }}>
              {t.netPositive ? '✓' : '✗'} {t.topicName}
            </span>
          ))}
        </div>
      )}

      {/* Disclosure notes */}
      {candidate.disclosureNotes?.length > 0 && (
        <div className="text-sm" style={{ color: 'var(--gold)', marginTop: '.1rem' }}>
          ⚠ {candidate.disclosureNotes.join(' · ')}
        </div>
      )}

      <Link to={`/candidate/${encodeURIComponent(candidate.name)}`} className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
        View full profile →
      </Link>
    </div>
  )
}
