import { readFileSync } from 'fs'
import { matchVoterToCandidates, buildVoterAnswers, formatMatchForDisplay } from './src/matcher.js'

const candidates = JSON.parse(readFileSync('./src/data/candidates.json', 'utf8'))
  .profiles.map(p => ({ ...p, name: p.candidate_name }))

// ─── SCALE REMINDER ───────────────────────────────────────────────────────────
// 1 = progressive/left end, 5 = conservative/right end
// EXCEPTIONS: T2 public safety (5=more enforcement), T10 guns (5=fewer restrictions),
//             T15 curriculum (5=more parental control)
// All three exceptions ALIGN with conservative direction so rule is consistent:
// low score = progressive lean, high score = conservative lean

// ─── PERSONA 1: DOGMATIC REPUBLICAN ──────────────────────────────────────────
// "Fiscal Hawk" — 58-year-old small business owner in Flower Mound.
// Prioritizes low taxes, strong borders, law & order, parental rights in schools.
// Tolerates social issues but they're not his top concern.
// Hates government waste and corruption above all.
const fiscalHawk = buildVoterAnswers([
  // T1 Fiscal Policy — cut spending, lower taxes (score=5, priority=5)
  { topicId: 1, priority: 5 },
  { topicId: 1, questionId: '1_1', answer: 5 },
  { topicId: 1, questionId: '1_2', answer: 5 },
  { topicId: 1, questionId: '1_3', answer: 4 },

  // T2 Public Safety — more enforcement (score=5, priority=4)
  { topicId: 2, priority: 4 },
  { topicId: 2, questionId: '2_1', answer: 5 },
  { topicId: 2, questionId: '2_2', answer: 4 },
  { topicId: 2, questionId: '2_3', answer: 5 },

  // T3 Education Funding — school choice/vouchers (score=4, priority=3)
  { topicId: 3, priority: 3 },
  { topicId: 3, questionId: '3_1', answer: 4 },
  { topicId: 3, questionId: '3_2', answer: 4 },
  { topicId: 3, questionId: '3_3', answer: 4 },

  // T4 Reproductive Rights — traditional/pro-life lean, NOT his top issue (score=4, priority=2)
  { topicId: 4, priority: 2 },
  { topicId: 4, questionId: '4_1', answer: 4 },
  { topicId: 4, questionId: '4_2', answer: 4 },

  // T5 Social Safety Net — reduce, promote self-reliance (score=5, priority=4)
  { topicId: 5, priority: 4 },
  { topicId: 5, questionId: '5_1', answer: 5 },
  { topicId: 5, questionId: '5_2', answer: 4 },
  { topicId: 5, questionId: '5_3', answer: 5 },

  // T6 Social Security — reform, not eliminate; concerned about solvency (score=4, priority=3)
  { topicId: 6, priority: 3 },
  { topicId: 6, questionId: '6_1', answer: 4 },
  { topicId: 6, questionId: '6_2', answer: 4 },

  // T7 LGBTQ+ — traditional values but not activist about it (score=4, priority=2)
  { topicId: 7, priority: 2 },
  { topicId: 7, questionId: '7_1', answer: 4 },
  { topicId: 7, questionId: '7_2', answer: 4 },

  // T8 Healthcare — market-based, oppose mandates (score=5, priority=3)
  { topicId: 8, priority: 3 },
  { topicId: 8, questionId: '8_1', answer: 5 },
  { topicId: 8, questionId: '8_2', answer: 4 },
  { topicId: 8, questionId: '8_3', answer: 5 },

  // T9 Immigration — strict enforcement, legal only (score=5, priority=5)
  { topicId: 9, priority: 5 },
  { topicId: 9, questionId: '9_1', answer: 5 },
  { topicId: 9, questionId: '9_2', answer: 5 },
  { topicId: 9, questionId: '9_3', answer: 5 },

  // T10 Gun Policy — strong 2A, fewer restrictions (score=5, priority=4)
  { topicId: 10, priority: 4 },
  { topicId: 10, questionId: '10_1', answer: 5 },
  { topicId: 10, questionId: '10_2', answer: 5 },

  // T11 Energy & Environment — energy independence, skeptical of climate mandates (score=4, priority=3)
  { topicId: 11, priority: 3 },
  { topicId: 11, questionId: '11_1', answer: 4 },
  { topicId: 11, questionId: '11_2', answer: 4 },
  { topicId: 11, questionId: '11_3', answer: 4 },

  // T12 Infrastructure — efficient spending, not blank checks (score=4, priority=2)
  { topicId: 12, priority: 2 },
  { topicId: 12, questionId: '12_1', answer: 4 },
  { topicId: 12, questionId: '12_2', answer: 4 },

  // T13 Land Use — property rights, limit regulations (score=4, priority=3)
  { topicId: 13, priority: 3 },
  { topicId: 13, questionId: '13_1', answer: 4 },
  { topicId: 13, questionId: '13_2', answer: 4 },

  // T14 Community Character — managed growth, preserve suburban feel (score=4, priority=3)
  { topicId: 14, priority: 3 },
  { topicId: 14, questionId: '14_1', answer: 4 },
  { topicId: 14, questionId: '14_2', answer: 4 },

  // T15 Education Curriculum — strong parental rights (score=5, priority=4)
  { topicId: 15, priority: 4 },
  { topicId: 15, questionId: '15_1', answer: 5 },
  { topicId: 15, questionId: '15_2', answer: 5 },

  // T16 Local Governance — demands transparency, anti-corruption (score=1 = max transparency, priority=5)
  { topicId: 16, priority: 5 },
  { topicId: 16, questionId: '16_1', answer: 1 },
  { topicId: 16, questionId: '16_2', answer: 1 },
  { topicId: 16, questionId: '16_3', answer: 1 },
])

// ─── PERSONA 2: DOGMATIC LIBERAL ─────────────────────────────────────────────
// "Progressive Advocate" — 34-year-old teacher in Flower Mound.
// Passionate about reproductive rights, LGBTQ+ equality, healthcare access.
// Wants strong social safety net. Fine paying more taxes for better services.
// Less focused on fiscal details; strongly opposes corruption.
const progressiveAdvocate = buildVoterAnswers([
  // T1 Fiscal Policy — expand services, tax the wealthy (score=1, priority=2)
  { topicId: 1, priority: 2 },
  { topicId: 1, questionId: '1_1', answer: 1 },
  { topicId: 1, questionId: '1_2', answer: 1 },
  { topicId: 1, questionId: '1_3', answer: 2 },

  // T2 Public Safety — reform-focused, not punitive (score=2, priority=3)
  { topicId: 2, priority: 3 },
  { topicId: 2, questionId: '2_1', answer: 2 },
  { topicId: 2, questionId: '2_2', answer: 2 },
  { topicId: 2, questionId: '2_3', answer: 2 },

  // T3 Education Funding — fully fund public schools, oppose vouchers (score=1, priority=4)
  { topicId: 3, priority: 4 },
  { topicId: 3, questionId: '3_1', answer: 1 },
  { topicId: 3, questionId: '3_2', answer: 1 },
  { topicId: 3, questionId: '3_3', answer: 2 },

  // T4 Reproductive Rights — strongly pro-choice (score=1, priority=5)
  { topicId: 4, priority: 5 },
  { topicId: 4, questionId: '4_1', answer: 1 },
  { topicId: 4, questionId: '4_2', answer: 1 },

  // T5 Social Safety Net — expand significantly (score=1, priority=5)
  { topicId: 5, priority: 5 },
  { topicId: 5, questionId: '5_1', answer: 1 },
  { topicId: 5, questionId: '5_2', answer: 1 },
  { topicId: 5, questionId: '5_3', answer: 1 },

  // T6 Social Security — protect and expand (score=1, priority=5)
  { topicId: 6, priority: 5 },
  { topicId: 6, questionId: '6_1', answer: 1 },
  { topicId: 6, questionId: '6_2', answer: 1 },

  // T7 LGBTQ+ — full equality, no exceptions (score=1, priority=5)
  { topicId: 7, priority: 5 },
  { topicId: 7, questionId: '7_1', answer: 1 },
  { topicId: 7, questionId: '7_2', answer: 1 },

  // T8 Healthcare — universal access, expand coverage (score=1, priority=5)
  { topicId: 8, priority: 5 },
  { topicId: 8, questionId: '8_1', answer: 1 },
  { topicId: 8, questionId: '8_2', answer: 1 },
  { topicId: 8, questionId: '8_3', answer: 1 },

  // T9 Immigration — welcoming, path to citizenship (score=1, priority=3)
  { topicId: 9, priority: 3 },
  { topicId: 9, questionId: '9_1', answer: 1 },
  { topicId: 9, questionId: '9_2', answer: 2 },
  { topicId: 9, questionId: '9_3', answer: 1 },

  // T10 Gun Policy — stricter regulations (score=1, priority=4)
  { topicId: 10, priority: 4 },
  { topicId: 10, questionId: '10_1', answer: 1 },
  { topicId: 10, questionId: '10_2', answer: 1 },

  // T11 Energy & Environment — aggressive climate action (score=1, priority=4)
  { topicId: 11, priority: 4 },
  { topicId: 11, questionId: '11_1', answer: 1 },
  { topicId: 11, questionId: '11_2', answer: 1 },
  { topicId: 11, questionId: '11_3', answer: 1 },

  // T12 Infrastructure — invest heavily in public transit, broadband (score=1, priority=3)
  { topicId: 12, priority: 3 },
  { topicId: 12, questionId: '12_1', answer: 1 },
  { topicId: 12, questionId: '12_2', answer: 2 },

  // T13 Land Use — affordable housing, mixed-use development (score=2, priority=3)
  { topicId: 13, priority: 3 },
  { topicId: 13, questionId: '13_1', answer: 2 },
  { topicId: 13, questionId: '13_2', answer: 2 },

  // T14 Community Character — inclusive, welcoming growth (score=2, priority=3)
  { topicId: 14, priority: 3 },
  { topicId: 14, questionId: '14_1', answer: 2 },
  { topicId: 14, questionId: '14_2', answer: 2 },

  // T15 Education Curriculum — inclusive curriculum, trust teachers (score=1, priority=5)
  { topicId: 15, priority: 5 },
  { topicId: 15, questionId: '15_1', answer: 1 },
  { topicId: 15, questionId: '15_2', answer: 1 },

  // T16 Local Governance — maximum transparency, anti-corruption (score=1, priority=5)
  { topicId: 16, priority: 5 },
  { topicId: 16, questionId: '16_1', answer: 1 },
  { topicId: 16, questionId: '16_2', answer: 1 },
  { topicId: 16, questionId: '16_3', answer: 1 },
])

// ─── PERSONA 3: TRUE MODERATE ─────────────────────────────────────────────────
// "Pragmatic Centrist" — 45-year-old engineer, Flower Mound homeowner.
// Fiscally center-right (dislikes waste but accepts some spending).
// Socially center-left (supports individual rights, dislikes extremes).
// Cares most about local issues: growth, infrastructure, schools.
// Strong anti-corruption stance.
const pragmaticCentrist = buildVoterAnswers([
  // T1 Fiscal Policy — balanced budget, targeted cuts (score=4, priority=3)
  { topicId: 1, priority: 3 },
  { topicId: 1, questionId: '1_1', answer: 4 },
  { topicId: 1, questionId: '1_2', answer: 3 },
  { topicId: 1, questionId: '1_3', answer: 4 },

  // T2 Public Safety — support law enforcement but also reform (score=3, priority=3)
  { topicId: 2, priority: 3 },
  { topicId: 2, questionId: '2_1', answer: 4 },
  { topicId: 2, questionId: '2_2', answer: 3 },
  { topicId: 2, questionId: '2_3', answer: 3 },

  // T3 Education Funding — adequately fund public schools, open to some choice (score=3, priority=4)
  { topicId: 3, priority: 4 },
  { topicId: 3, questionId: '3_1', answer: 2 },
  { topicId: 3, questionId: '3_2', answer: 3 },
  { topicId: 3, questionId: '3_3', answer: 3 },

  // T4 Reproductive Rights — pro-choice with some limits (score=2, priority=3)
  { topicId: 4, priority: 3 },
  { topicId: 4, questionId: '4_1', answer: 2 },
  { topicId: 4, questionId: '4_2', answer: 2 },

  // T5 Social Safety Net — targeted assistance, not universal (score=3, priority=3)
  { topicId: 5, priority: 3 },
  { topicId: 5, questionId: '5_1', answer: 3 },
  { topicId: 5, questionId: '5_2', answer: 3 },
  { topicId: 5, questionId: '5_3', answer: 3 },

  // T6 Social Security — protect it, modest reform (score=3, priority=4)
  { topicId: 6, priority: 4 },
  { topicId: 6, questionId: '6_1', answer: 3 },
  { topicId: 6, questionId: '6_2', answer: 2 },

  // T7 LGBTQ+ — support equal rights (score=2, priority=3)
  { topicId: 7, priority: 3 },
  { topicId: 7, questionId: '7_1', answer: 2 },
  { topicId: 7, questionId: '7_2', answer: 2 },

  // T8 Healthcare — expand access, keep private options (score=2, priority=4)
  { topicId: 8, priority: 4 },
  { topicId: 8, questionId: '8_1', answer: 2 },
  { topicId: 8, questionId: '8_2', answer: 3 },
  { topicId: 8, questionId: '8_3', answer: 2 },

  // T9 Immigration — secure border but humane (score=3, priority=3)
  { topicId: 9, priority: 3 },
  { topicId: 9, questionId: '9_1', answer: 3 },
  { topicId: 9, questionId: '9_2', answer: 3 },
  { topicId: 9, questionId: '9_3', answer: 3 },

  // T10 Gun Policy — background checks, some restrictions (score=2, priority=3)
  { topicId: 10, priority: 3 },
  { topicId: 10, questionId: '10_1', answer: 2 },
  { topicId: 10, questionId: '10_2', answer: 2 },

  // T11 Energy — climate matters, balanced energy portfolio (score=2, priority=3)
  { topicId: 11, priority: 3 },
  { topicId: 11, questionId: '11_1', answer: 2 },
  { topicId: 11, questionId: '11_2', answer: 3 },
  { topicId: 11, questionId: '11_3', answer: 2 },

  // T12 Infrastructure — invest smartly (score=2, priority=4)
  { topicId: 12, priority: 4 },
  { topicId: 12, questionId: '12_1', answer: 2 },
  { topicId: 12, questionId: '12_2', answer: 2 },

  // T13 Land Use — smart growth, protect neighborhoods (score=3, priority=5)
  { topicId: 13, priority: 5 },
  { topicId: 13, questionId: '13_1', answer: 3 },
  { topicId: 13, questionId: '13_2', answer: 3 },

  // T14 Community Character — quality growth, not sprawl (score=3, priority=4)
  { topicId: 14, priority: 4 },
  { topicId: 14, questionId: '14_1', answer: 3 },
  { topicId: 14, questionId: '14_2', answer: 3 },

  // T15 Education Curriculum — balanced: parent voice + professional educators (score=3, priority=3)
  { topicId: 15, priority: 3 },
  { topicId: 15, questionId: '15_1', answer: 3 },
  { topicId: 15, questionId: '15_2', answer: 3 },

  // T16 Local Governance — strong transparency, anti-corruption (score=1, priority=5)
  { topicId: 16, priority: 5 },
  { topicId: 16, questionId: '16_1', answer: 1 },
  { topicId: 16, questionId: '16_2', answer: 1 },
  { topicId: 16, questionId: '16_3', answer: 1 },
])

// ─── RUN MATCHES ─────────────────────────────────────────────────────────────
function runPersona(name, description, voterAnswers) {
  console.log('\n' + '═'.repeat(70))
  console.log(`  ${name}`)
  console.log(`  ${description}`)
  console.log('═'.repeat(70))

  const result = matchVoterToCandidates(voterAnswers, candidates)
  const LEVEL_ORDER = ['federal', 'statewide', 'state_legislature', 'county']

  for (const level of LEVEL_ORDER) {
    const races = result.races.filter(r => r.level === level)
    if (!races.length) continue

    console.log(`\n  ── ${level.toUpperCase().replace('_', ' ')} ──`)
    for (const race of races) {
      console.log(`\n  ${race.race}`)
      const sorted = [...race.candidates].sort((a, b) => b.matchPercent - a.matchPercent)
      for (const c of sorted) {
        const pct = Math.round(c.matchPercent)
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5))
        const drivers = c.topDrivers?.slice(0, 2).map(d => (d.netPositive ? '+' : '-') + d.topicName).join(', ') ?? ''
        console.log(`    ${String(pct).padStart(3)}% ${bar}  ${c.name} (${c.party[0]})  [${drivers}]`)
      }
    }
  }
  console.log('')
}

runPersona(
  '🔴 FISCAL HAWK (Dogmatic Republican)',
  'Prioritizes: fiscal restraint, immigration, law & order, parental rights, 2A. Social issues: low priority.',
  fiscalHawk
)

runPersona(
  '🔵 PROGRESSIVE ADVOCATE (Dogmatic Liberal)',
  'Prioritizes: reproductive rights, LGBTQ+, healthcare, safety net, education. Fiscal: lower priority.',
  progressiveAdvocate
)

runPersona(
  '🟣 PRAGMATIC CENTRIST (True Moderate)',
  'Prioritizes: local growth, infrastructure, social security, schools. Leans center-left on social, center-right on fiscal.',
  pragmaticCentrist
)
