import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import questionsData from '../data/questions.json'
import { buildVoterAnswers } from '../matcher.js'

// Quiz steps: 'intro' → 'priorities' → 'questions_<topicIdx>' → 'reviewing' → done
const TOPICS = questionsData.topics

export default function Quiz() {
  const navigate = useNavigate()
  const [step, setStep] = useState('intro')
  const [topicIdx, setTopicIdx] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)

  // priorities[topicId] = 1–5
  const [priorities, setPriorities] = useState({})
  // answers[questionId] = 1–5 | null (skipped)
  const [answers, setAnswers] = useState({})

  const totalTopics = TOPICS.length

  // ── helpers ─────────────────────────────────────────────
  const currentTopic = TOPICS[topicIdx]
  const currentQuestion = currentTopic?.questions[questionIdx]

  const progressPercent = step === 'intro' ? 0
    : step === 'priorities' ? 5
    : step === 'done' ? 100
    : Math.round(10 + (topicIdx / totalTopics) * 88)

  function handlePrioritySelect(topicId, value) {
    setPriorities(p => ({ ...p, [topicId]: value }))
  }

  function handleAnswerSelect(questionId, value) {
    setAnswers(a => ({ ...a, [questionId]: value }))
  }

  function advanceQuestion() {
    const topic = TOPICS[topicIdx]
    if (questionIdx < topic.questions.length - 1) {
      setQuestionIdx(q => q + 1)
    } else if (topicIdx < totalTopics - 1) {
      setTopicIdx(t => t + 1)
      setQuestionIdx(0)
    } else {
      setStep('done')
    }
  }

  function goBackQuestion() {
    if (questionIdx > 0) {
      setQuestionIdx(q => q - 1)
    } else if (topicIdx > 0) {
      setTopicIdx(t => t - 1)
      setQuestionIdx(TOPICS[topicIdx - 1].questions.length - 1)
    } else {
      setStep('priorities')
    }
  }

  function startQuestions() {
    setTopicIdx(0)
    setQuestionIdx(0)
    setStep('questions')
  }

  function handleFinish() {
    // Build voterAnswers: one entry per topic to set priority,
    // then one entry per answered question
    const responses = []
    for (const topic of TOPICS) {
      const priority = priorities[topic.topic_id] ?? 3
      // Set priority for this topic (no questionId = priority-only entry)
      responses.push({ topicId: topic.topic_id, priority })
      // Add each answered question
      for (const q of topic.questions) {
        const answer = answers[q.question_id]
        if (answer != null) {
          responses.push({ topicId: topic.topic_id, questionId: q.question_id, answer })
        }
      }
    }
    const voterAnswers = buildVoterAnswers(responses)
    sessionStorage.setItem('voterAnswers', JSON.stringify(voterAnswers))
    navigate('/results')
  }

  // ── render ───────────────────────────────────────────────
  if (step === 'intro') return <IntroScreen onStart={() => setStep('priorities')} />
  if (step === 'priorities') return (
    <PrioritiesScreen
      topics={TOPICS}
      priorities={priorities}
      onSelect={handlePrioritySelect}
      onNext={startQuestions}
      onBack={() => setStep('intro')}
    />
  )
  if (step === 'questions') return (
    <QuestionScreen
      topic={currentTopic}
      question={currentQuestion}
      topicIdx={topicIdx}
      questionIdx={questionIdx}
      totalTopics={totalTopics}
      totalQuestionsInTopic={currentTopic?.questions.length ?? 0}
      answer={answers[currentQuestion?.question_id]}
      progressPercent={progressPercent}
      onAnswer={val => handleAnswerSelect(currentQuestion.question_id, val)}
      onNext={advanceQuestion}
      onBack={goBackQuestion}
      onSkip={advanceQuestion}
    />
  )
  if (step === 'done') return (
    <ReviewScreen
      topics={TOPICS}
      answers={answers}
      priorities={priorities}
      onFinish={handleFinish}
      onBack={() => { setTopicIdx(totalTopics - 1); setQuestionIdx(TOPICS[totalTopics - 1].questions.length - 1); setStep('questions') }}
    />
  )
}

// ── Sub-screens ──────────────────────────────────────────────────────────────

function IntroScreen({ onStart }) {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div className="card" style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>About this quiz</h1>
        <p style={{ marginBottom: '1rem' }}>
          {questionsData.quiz_intro}
        </p>
        <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <strong>How it works:</strong>
          <ul style={{ margin: '.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>First, rate how important each <strong>topic</strong> is to you (1–5)</li>
            <li>Then answer 2–3 questions per topic about your position</li>
            <li>Skip any question you'd rather not answer</li>
            <li>We'll show your match % for every candidate on your November ballot</li>
          </ul>
        </div>
        <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
          Takes about 10–15 minutes. Your answers are never stored — they stay in your browser.
        </p>
        <button className="btn btn--primary btn--lg w-full" onClick={onStart}>
          Let's begin →
        </button>
      </div>
    </div>
  )
}

function PrioritiesScreen({ topics, priorities, onSelect, onNext, onBack }) {
  const allSet = topics.every(t => priorities[t.topic_id] != null)

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        <button className="btn btn--ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>← Back</button>
        <h2 style={{ marginBottom: '.25rem' }}>Step 1 of 2 — Set your priorities</h2>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          {questionsData.priority_intro || 'How important is each topic to you? This determines how much weight it gets in your match.'}
        </p>
        <div className="alert alert--info" style={{ marginBottom: '1.5rem' }}>
          <strong>Scale: 1 = Not important at all &nbsp;·&nbsp; 5 = Extremely important</strong><br />
          <span style={{ fontSize: '.85rem' }}>Topics you rate 4 or 5 will count more heavily in your candidate matches.</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {topics.map(topic => (
            <div key={topic.topic_id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{topic.topic_name}</div>
                  <div className="text-muted text-sm">
                    Applies to: {topic.applicable_levels?.join(', ') ?? 'all races'}
                  </div>
                </div>
                <PriorityPicker
                  value={priorities[topic.topic_id]}
                  onChange={v => onSelect(topic.topic_id, v)}
                />
              </div>
            </div>
          ))}
        </div>

        {!allSet && (
          <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
            Rate all topics to continue (or we'll default unrated topics to 3).
          </p>
        )}
        <button
          className="btn btn--primary btn--lg w-full"
          onClick={onNext}
        >
          Continue to questions →
        </button>
      </div>
    </div>
  )
}

function PriorityPicker({ value, onChange }) {
  const labels = ['', 'Not important', 'Somewhat important', 'Moderately important', 'Very important', 'Extremely important']
  const colors = ['', '#9ca3af', '#6b7280', '#2563eb', '#1a56a4', '#c0392b']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.3rem' }}>
      <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            title={`${v} — ${labels[v]}`}
            onClick={() => onChange(v)}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '2px solid',
              borderColor: value === v ? colors[v] : 'var(--border)',
              background: value === v ? colors[v] : '#fff',
              color: value === v ? '#fff' : 'var(--gray-500)',
              fontWeight: 700, fontSize: '.85rem',
              transition: 'all .15s',
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {value != null && (
        <div style={{ fontSize: '.75rem', color: colors[value], fontWeight: 600 }}>
          {value} — {labels[value]}
        </div>
      )}
    </div>
  )
}

function QuestionScreen({
  topic, question, topicIdx, questionIdx,
  totalTopics, totalQuestionsInTopic,
  answer, progressPercent,
  onAnswer, onNext, onBack, onSkip
}) {
  if (!question) return null

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem' }}>
            <span className="text-muted text-sm">
              Topic {topicIdx + 1} of {totalTopics}: <strong style={{ color: 'var(--text-h)' }}>{topic.topic_name}</strong>
            </span>
            <span className="text-muted text-sm">{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="text-muted text-sm" style={{ marginBottom: '.75rem' }}>
            Question {questionIdx + 1} of {totalQuestionsInTopic}
          </div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
            {question.question_text}
          </h2>

          {/* Scale */}
          <ScalePicker
            value={answer}
            lowLabel={question.scale_low_label}
            highLabel={question.scale_high_label}
            onChange={onAnswer}
          />
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn--secondary" onClick={onBack}>← Back</button>
          <button
            className="btn btn--ghost text-sm"
            onClick={onSkip}
            style={{ marginLeft: 'auto' }}
          >
            Skip this question
          </button>
          <button
            className="btn btn--primary"
            onClick={onNext}
            disabled={answer == null}
          >
            {topicIdx === totalTopics - 1 && questionIdx === totalQuestionsInTopic - 1
              ? 'Finish →' : 'Next →'}
          </button>
        </div>
        {answer == null && (
          <p className="text-muted text-sm mt-1" style={{ textAlign: 'right' }}>
            Select an answer or skip to continue
          </p>
        )}
      </div>
    </div>
  )
}

function ScalePicker({ value, lowLabel, highLabel, onChange }) {
  return (
    <div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: '42%' }}>{lowLabel}</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: '42%', textAlign: 'right' }}>{highLabel}</span>
      </div>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map(v => {
          const selected = value === v
          const color = selected
            ? v <= 2 ? '#1a56a4' : v === 3 ? '#6b7280' : '#c0392b'
            : 'transparent'
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                flex: 1, padding: '.75rem .25rem', borderRadius: 8,
                border: `2px solid ${selected ? color : 'var(--border)'}`,
                background: selected ? color : '#fff',
                color: selected ? '#fff' : 'var(--gray-700)',
                fontWeight: selected ? 700 : 400,
                fontSize: '1.1rem',
                transition: 'all .15s',
              }}
            >
              {v}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.35rem' }}>
        <span className="text-sm" style={{ color: '#1a56a4' }}>← Agree more</span>
        <span className="text-sm" style={{ color: '#6b7280' }}>Neutral</span>
        <span className="text-sm" style={{ color: '#c0392b' }}>Agree more →</span>
      </div>
    </div>
  )
}

function ReviewScreen({ topics, answers, priorities, onFinish, onBack }) {
  const answeredCount = Object.values(answers).filter(v => v != null).length
  const totalQuestions = topics.reduce((s, t) => s + t.questions.length, 0)

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '1rem' }}>Quiz complete!</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
            {answeredCount < totalQuestions && ` (${totalQuestions - answeredCount} skipped)`}
          </p>

          {/* Quick priority summary */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <strong style={{ fontSize: '.9rem', display: 'block', marginBottom: '.5rem' }}>Your top priorities:</strong>
            {topics
              .filter(t => (priorities[t.topic_id] ?? 3) >= 4)
              .sort((a, b) => (priorities[b.topic_id] ?? 3) - (priorities[a.topic_id] ?? 3))
              .map(t => (
                <div key={t.topic_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.25rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm">{t.topic_name}</span>
                  <span style={{ color: '#c0392b', fontWeight: 700 }}>{'★'.repeat(priorities[t.topic_id] ?? 3)}</span>
                </div>
              ))
            }
            {topics.filter(t => (priorities[t.topic_id] ?? 3) >= 4).length === 0 && (
              <p className="text-muted text-sm">No topics rated 4 or 5 — all topics weighted equally.</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '.75rem', flexDirection: 'column' }}>
            <button className="btn btn--primary btn--lg w-full" onClick={onFinish}>
              See my candidate matches →
            </button>
            <button className="btn btn--secondary w-full" onClick={onBack}>
              ← Go back and review answers
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
