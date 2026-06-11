import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import candidatesData from '../data/candidates.json'
import questionsData from '../data/questions.json'

const TOPIC_MAP = {}
for (const t of questionsData.topics) {
  TOPIC_MAP[t.topic_id] = t.topic_name
}

const CONFIDENCE_LABELS = {
  explicit: { label: 'Directly stated', color: '#1a7a4a', bg: '#e6f4ec' },
  implied:  { label: 'Strongly implied', color: '#1a56a4', bg: '#e8f0fc' },
  inferred: { label: 'Inferred from party/context', color: '#b8860b', bg: '#fef9e7' },
  unknown:  { label: 'No data found', color: '#6b7280', bg: '#f3f4f6' },
}

const PARTY_SHORT = {
  Republican: 'R', Democrat: 'D', Libertarian: 'L', Independent: 'I',
}

function getPartyBadge(party) {
  const short = PARTY_SHORT[party] || party.charAt(0)
  const cls = party === 'Republican' ? 'r' : party === 'Democrat' ? 'd' : party === 'Libertarian' ? 'l' : 'i'
  return <span className={`badge badge--${cls}`}>{short} {party}</span>
}

function ScoreDot({ score }) {
  const labels = ['', 'Strong left', 'Lean left', 'Moderate/Center', 'Lean right', 'Strong right']
  const colors = ['', '#1a56a4', '#5b8dd9', '#6b7280', '#e07850', '#c0392b']
  return (
    <div style={{ display: 'flex', gap: '.25rem', alignItems: 'center' }}>
      {[1,2,3,4,5].map(v => (
        <div key={v} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: v === score ? colors[v] : 'var(--border)',
          border: v === score ? 'none' : '1px solid var(--border)',
        }} title={v === score ? labels[v] : ''} />
      ))}
      <span className="text-sm" style={{ color: colors[score ?? 3], marginLeft: '.4rem' }}>
        {labels[score ?? 3] ?? '—'}
      </span>
    </div>
  )
}

export default function CandidateDetail() {
  const { name } = useParams()
  const navigate = useNavigate()

  const candidate = useMemo(() => {
    const decoded = decodeURIComponent(name)
    return candidatesData.profiles?.find(p => p.candidate_name === decoded)
  }, [name])

  const rosterEntry = useMemo(() => {
    const decoded = decodeURIComponent(name)
    return candidatesData.roster?.candidates?.find(c => c.name === decoded)
  }, [name])

  if (!candidate) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2>Candidate not found</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            We don't have a profile for "<strong>{decodeURIComponent(name)}</strong>" yet.
          </p>
          <button className="btn btn--secondary" onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </div>
    )
  }

  const knownPositions = candidate.positions?.filter(p => p.confidence !== 'unknown') ?? []
  const unknownPositions = candidate.positions?.filter(p => p.confidence === 'unknown') ?? []

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'var(--blue)', color: '#fff', padding: '2.5rem 1.5rem' }}>
        <div className="container">
          <button
            className="btn btn--sm"
            style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', marginBottom: '1.25rem' }}
            onClick={() => navigate(-1)}
          >
            ← Back to results
          </button>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', marginBottom: '.5rem' }}>
            {candidate.candidate_name}
          </h1>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {getPartyBadge(candidate.party)}
            <span style={{ opacity: .85 }}>{candidate.race}</span>
            {candidate.incumbent && <span style={{ opacity: .7, fontSize: '.875rem' }}>· Incumbent</span>}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>

          {/* Bio */}
          <div className="card">
            <h3 style={{ marginBottom: '.75rem' }}>About</h3>
            <p>{candidate.bio_summary}</p>
            {candidate.overall_summary && (
              <>
                <hr className="divider" />
                <p>{candidate.overall_summary}</p>
              </>
            )}
            {rosterEntry?.website && (
              <a href={rosterEntry.website} target="_blank" rel="noopener noreferrer" className="btn btn--secondary btn--sm" style={{ marginTop: '.75rem', display: 'inline-flex' }}>
                🌐 Campaign website ↗
              </a>
            )}
          </div>

          {/* Endorsements & Finance */}
          {(candidate.key_endorsements?.length > 0 || candidate.campaign_finance_notes) && (
            <div className="card">
              {candidate.key_endorsements?.length > 0 && (
                <>
                  <h3 style={{ marginBottom: '.5rem' }}>Key endorsements</h3>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
                    {candidate.key_endorsements.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
                  </ul>
                </>
              )}
              {candidate.campaign_finance_notes && (
                <>
                  {candidate.key_endorsements?.length > 0 && <hr className="divider" />}
                  <h3 style={{ marginBottom: '.5rem' }}>Campaign finance</h3>
                  <p className="text-sm">{candidate.campaign_finance_notes}</p>
                </>
              )}
            </div>
          )}

          {/* Issue positions */}
          <div className="card">
            <h3 style={{ marginBottom: '.25rem' }}>Issue positions</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
              Positions researched from public sources. Scale: 1 = progressive/left, 5 = conservative/right.
              Confidence reflects how directly the candidate stated this position.
            </p>

            {knownPositions.length === 0 && (
              <p className="text-muted">No position data available for this candidate.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {knownPositions.map(pos => {
                const conf = CONFIDENCE_LABELS[pos.confidence] ?? CONFIDENCE_LABELS.unknown
                return (
                  <div key={pos.topic_id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.4rem' }}>
                      <strong style={{ color: 'var(--text-h)' }}>
                        {pos.topic_name ?? TOPIC_MAP[pos.topic_id] ?? `Topic ${pos.topic_id}`}
                      </strong>
                      <span style={{ fontSize: '.75rem', padding: '.15rem .5rem', borderRadius: 999, background: conf.bg, color: conf.color }}>
                        {conf.label}
                      </span>
                    </div>
                    <ScoreDot score={pos.score} />
                    {pos.summary && <p className="text-sm" style={{ marginTop: '.4rem', color: 'var(--text)' }}>{pos.summary}</p>}
                    {pos.notable_quote && (
                      <blockquote style={{
                        borderLeft: '3px solid var(--border)', paddingLeft: '.75rem',
                        margin: '.5rem 0 0', fontStyle: 'italic', fontSize: '.875rem',
                        color: 'var(--text-muted)'
                      }}>
                        "{pos.notable_quote}"
                      </blockquote>
                    )}
                    {pos.source_url && (
                      <a href={pos.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm" style={{ display: 'inline-block', marginTop: '.35rem', color: 'var(--blue)' }}>
                        Source ↗
                      </a>
                    )}
                  </div>
                )
              })}
            </div>

            {unknownPositions.length > 0 && (
              <details style={{ marginTop: '1rem' }}>
                <summary className="text-muted text-sm" style={{ cursor: 'pointer' }}>
                  {unknownPositions.length} topics with no data found (click to expand)
                </summary>
                <ul style={{ margin: '.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
                  {unknownPositions.map(p => (
                    <li key={p.topic_id} className="text-sm text-muted">
                      {p.topic_name ?? TOPIC_MAP[p.topic_id] ?? `Topic ${p.topic_id}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Sources */}
          {rosterEntry?.sources?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '.75rem' }}>Sources</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
                {rosterEntry.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s} target="_blank" rel="noopener noreferrer" className="text-sm">
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data disclaimer */}
          <div className="alert alert--warn">
            <strong>Data notice:</strong> Candidate positions are researched by AI agents from publicly available sources
            as of June 2026. Positions may evolve during the campaign. Always verify with the candidate's
            official website and primary sources before voting.
          </div>

        </div>
      </div>
    </div>
  )
}
