import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import questionsData from '../data/questions.json'
import { buildVoterAnswers } from '../matcher.js'
import { normalizeAnswer } from '../scaleDirections.js'

const TOPICS = questionsData.topics

// Lite assessment: the single most-discriminating question per topic,
// 15 questions total (Community Character is covered by the full quiz only).
const LITE_QUESTION_IDS = new Set([
  '1a',  // Fiscal: spending/tax tradeoff
  '2b',  // Public safety: rehabilitation vs punishment
  '3b',  // Education: vouchers — THE live TX differentiator
  '4a',  // Reproductive rights: legality
  '5a',  // Safety net: role of government
  '6a',  // Social Security: solvency tradeoff
  '7a',  // LGBTQ+: legal protections
  '8a',  // Healthcare: coverage structure
  '9b',  // Immigration: status of undocumented residents
  '10b', // Guns: AR-platform restrictions
  '11a', // Energy: transition mandates
  '12c', // Infrastructure: water & grid investment
  '13a', // Land use: density and growth
  '15b', // Curriculum: parental control of materials
  '16c', // Governance: ethics rules strictness
])

export default function Quiz() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)       // null → mode select; 'full' | 'lite'
  const [priorities, setPriorities] = useState({})
  const [answers, setAnswers] = useState({})

  // Topics + questions visible in the chosen mode
  const visibleTopics = useMemo(() => {
    if (mode !== 'lite') return TOPICS
    return TOPICS
      .map(t => ({ ...t, questions: t.questions.filter(q => LITE_QUESTION_IDS.has(q.question_id)) }))
      .filter(t => t.questions.length > 0)
  }, [mode])

  const totalQuestions = visibleTopics.reduce((s, t) => s + t.questions.length, 0)
  const answeredCount = visibleTopics.reduce(
    (s, t) => s + t.questions.filter(q => answers[q.question_id] != null).length, 0)
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0

  function handleFinish() {
    const responses = []
    for (const topic of visibleTopics) {
      responses.push({ topicId: topic.topic_id, priority: priorities[topic.topic_id] ?? 3 })
      for (const q of topic.questions) {
        const raw = answers[q.question_id]
        if (raw != null) {
          responses.push({
            topicId: topic.topic_id,
            questionId: q.question_id,
            answer: normalizeAnswer(q.question_id, raw),
          })
        }
      }
    }
    sessionStorage.setItem('voterAnswers', JSON.stringify(buildVoterAnswers(responses)))
    sessionStorage.setItem('quizMode', mode)
    navigate('/results')
  }

  if (!mode) return <ModeSelect onSelect={setMode} />

  return (
    <div>
      {/* Sticky progress header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '.6rem 1.5rem',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="text-sm" style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-h)' }}>
            {mode === 'lite' ? 'Lite' : 'Full'} assessment
          </span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
      </div>

      <div className="container" style={{ padding: '1.5rem' }}>
        <button className="btn btn--ghost btn--sm" onClick={() => { setMode(null); setAnswers({}); setPriorities({}) }}>
          ← Change assessment type
        </button>

        <div className="alert alert--info mt-2" style={{ marginBottom: '1.5rem' }}>
          <strong>How to answer:</strong> For each question, 1 means you agree with the left
          statement, 5 with the right, 3 = middle ground. Leave a question blank to skip it —
          skipped questions don't count toward your match. Above each topic, rate how important
          that issue is to you (1 = not important, 5 = extremely important).
        </div>

        {/* All topics + questions on one page */}
        {visibleTopics.map(topic => (
          <TopicBlock
            key={topic.topic_id}
            topic={topic}
            priority={priorities[topic.topic_id]}
            onPriority={v => setPriorities(p => ({ ...p, [topic.topic_id]: v }))}
            answers={answers}
            onAnswer={(qid, v) => setAnswers(a => ({ ...a, [qid]: a[qid] === v ? null : v }))}
          />
        ))}

        {/* Finish */}
        <div className="card" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions answered
            {answeredCount < totalQuestions && ` — unanswered questions are skipped`}
          </p>
          <button
            className="btn btn--primary btn--lg"
            disabled={answeredCount === 0}
            onClick={handleFinish}
          >
            See my candidate matches →
          </button>
          {answeredCount === 0 && (
            <p className="text-muted text-sm mt-1">Answer at least one question to see matches</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mode selection ──────────────────────────────────────────────────────────

function ModeSelect({ onSelect }) {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>📋</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '.75rem' }}>Choose your assessment</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          {questionsData.quiz_intro}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <button
            onClick={() => onSelect('lite')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', border: '2px solid var(--border)', background: '#fff' }}
          >
            <div style={{ fontSize: '2.25rem', marginBottom: '.5rem' }}>⚡</div>
            <h3 style={{ marginBottom: '.35rem' }}>Lite Assessment</h3>
            <div style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: '.5rem' }}>15 questions · ~5 minutes</div>
            <p className="text-muted text-sm">
              One key question per issue. A quick read on your matches — great starting point.
            </p>
          </button>
          <button
            onClick={() => onSelect('full')}
            className="card"
            style={{ cursor: 'pointer', textAlign: 'center', border: '2px solid var(--blue)', background: 'var(--blue-pale)' }}
          >
            <div style={{ fontSize: '2.25rem', marginBottom: '.5rem' }}>🎯</div>
            <h3 style={{ marginBottom: '.35rem' }}>Full Assessment</h3>
            <div style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: '.5rem' }}>49 questions · ~15 minutes</div>
            <p className="text-muted text-sm">
              2–4 questions per issue for the most accurate matches. Recommended if you have the time.
            </p>
          </button>
        </div>
        <p className="text-muted text-sm" style={{ marginTop: '1.5rem' }}>
          Your answers stay in your browser — nothing is stored or sent anywhere.
        </p>
      </div>
    </div>
  )
}

// ─── One topic section: priority row + its questions ────────────────────────

function TopicBlock({ topic, priority, onPriority, answers, onAnswer }) {
  const answered = topic.questions.filter(q => answers[q.question_id] != null).length
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      {/* Topic header with priority picker */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '.75rem', borderBottom: '2px solid var(--border)',
        paddingBottom: '.85rem', marginBottom: '1rem',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{topic.topic_name}</h3>
          <span className="text-muted text-sm">{answered}/{topic.questions.length} answered</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-sm" style={{ marginBottom: '.25rem', color: 'var(--text-muted)' }}>
            How important is this to you?
          </div>
          <PriorityPicker value={priority} onChange={onPriority} />
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
        {topic.questions.map(q => (
          <QuestionRow
            key={q.question_id}
            question={q}
            value={answers[q.question_id]}
            onChange={v => onAnswer(q.question_id, v)}
          />
        ))}
      </div>
    </div>
  )
}

function QuestionRow({ question, value, onChange }) {
  return (
    <div>
      <p style={{ fontWeight: 600, color: 'var(--text-h)', marginBottom: '.6rem' }}>
        {question.question_text}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '.4rem' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: '44%' }}>{question.scale_low_label}</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: '44%', textAlign: 'right' }}>{question.scale_high_label}</span>
      </div>
      <div style={{ display: 'flex', gap: '.45rem' }}>
        {[1, 2, 3, 4, 5].map(v => {
          const selected = value === v
          const color = v <= 2 ? '#1a56a4' : v === 3 ? '#6b7280' : '#c0392b'
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              aria-pressed={selected}
              style={{
                flex: 1, padding: '.55rem .25rem', borderRadius: 8,
                border: `2px solid ${selected ? color : 'var(--border)'}`,
                background: selected ? color : '#fff',
                color: selected ? '#fff' : 'var(--gray-700)',
                fontWeight: selected ? 700 : 400,
                fontSize: '1rem', transition: 'all .12s',
              }}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PriorityPicker({ value, onChange }) {
  const labels = ['', 'Not important', 'Somewhat important', 'Moderately important', 'Very important', 'Extremely important']
  const colors = ['', '#9ca3af', '#6b7280', '#2563eb', '#1a56a4', '#c0392b']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem' }}>
      <div style={{ display: 'flex', gap: '.3rem' }}>
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            title={`${v} — ${labels[v]}`}
            onClick={() => onChange(v)}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px solid',
              borderColor: value === v ? colors[v] : 'var(--border)',
              background: value === v ? colors[v] : '#fff',
              color: value === v ? '#fff' : 'var(--gray-500)',
              fontWeight: 700, fontSize: '.8rem', transition: 'all .12s',
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {value != null && (
        <span style={{ fontSize: '.72rem', color: colors[value], fontWeight: 600 }}>
          {labels[value]}
        </span>
      )}
    </div>
  )
}
