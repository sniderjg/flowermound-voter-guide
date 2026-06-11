import { readFileSync } from 'fs'
import { matchVoterToCandidates, buildVoterAnswers } from './src/matcher.js'
import { normalizeAnswer } from './src/scaleDirections.js'

const candidates = JSON.parse(readFileSync('./src/data/candidates.json', 'utf8'))
  .profiles.map(p => ({ ...p, name: p.candidate_name }))

// Agent-generated answers against the REVISED question set (raw on-screen-label space)
const PERSONAS = {
  '🔴 FISCAL HAWK': {
    priorities: {1:5,2:4,3:3,4:2,5:2,6:3,7:2,8:3,9:5,10:4,11:3,12:2,13:3,14:3,15:4,16:5},
    answers: {'1a':1,'1b':1,'1c':1,'2a':4,'2b':4,'2c':4,'3a':1,'3b':5,'3c':1,'4a':2,'4b':1,'4c':2,'5a':1,'5b':1,'5c':1,'6a':2,'6b':1,'6c':5,'7a':1,'7b':1,'7c':5,'8a':1,'8b':2,'8c':1,'9a':1,'9b':1,'9c':2,'10a':1,'10b':1,'10c':5,'11a':1,'11b':1,'11c':1,'12a':1,'12b':1,'12c':1,'13a':2,'13b':2,'13c':1,'14a':2,'14b':2,'14c':1,'15a':1,'15b':5,'15c':1,'16a':4,'16b':4,'16c':4,'16d':1},
  },
  '🔵 PROGRESSIVE ADVOCATE': {
    priorities: {1:2,2:3,3:4,4:5,5:5,6:5,7:5,8:5,9:3,10:4,11:4,12:3,13:3,14:3,15:5,16:5},
    answers: {'1a':5,'1b':5,'1c':4,'2a':2,'2b':1,'2c':1,'3a':5,'3b':1,'3c':5,'4a':5,'4b':5,'4c':5,'5a':5,'5b':5,'5c':5,'6a':5,'6b':5,'6c':1,'7a':5,'7b':5,'7c':1,'8a':5,'8b':5,'8c':5,'9a':5,'9b':5,'9c':4,'10a':5,'10b':5,'10c':1,'11a':5,'11b':5,'11c':5,'12a':5,'12b':5,'12c':5,'13a':4,'13b':4,'13c':3,'14a':3,'14b':4,'14c':3,'15a':5,'15b':1,'15c':5,'16a':5,'16b':3,'16c':5,'16d':5},
  },
  '🟣 PRAGMATIC CENTRIST': {
    priorities: {1:3,2:3,3:4,4:3,5:3,6:4,7:3,8:4,9:3,10:3,11:3,12:4,13:5,14:4,15:3,16:5},
    answers: {'1a':2,'1b':3,'1c':2,'2a':3,'2b':3,'2c':2,'3a':4,'3b':2,'3c':2,'4a':4,'4b':3,'4c':4,'5a':3,'5b':2,'5c':3,'6a':4,'6b':3,'6c':3,'7a':4,'7b':3,'7c':3,'8a':2,'8b':4,'8c':3,'9a':2,'9b':4,'9c':3,'10a':4,'10b':3,'10c':2,'11a':3,'11b':3,'11c':3,'12a':3,'12b':4,'12c':5,'13a':2,'13b':4,'13c':2,'14a':4,'14b':3,'14c':2,'15a':3,'15b':2,'15c':3,'16a':4,'16b':3,'16c':5,'16d':3},
  },
}

function toVoterAnswers(persona) {
  const responses = []
  for (const [topicId, priority] of Object.entries(persona.priorities)) {
    responses.push({ topicId: Number(topicId), priority })
  }
  for (const [qId, raw] of Object.entries(persona.answers)) {
    responses.push({
      topicId: Number(qId.match(/^\d+/)[0]),
      questionId: qId,
      answer: normalizeAnswer(qId, raw),
    })
  }
  return buildVoterAnswers(responses)
}

const LEVEL_ORDER = ['federal', 'statewide', 'state_legislature', 'county', 'local']

for (const [label, persona] of Object.entries(PERSONAS)) {
  console.log('\n' + '═'.repeat(76))
  console.log(`  ${label}`)
  console.log('═'.repeat(76))
  const result = matchVoterToCandidates(toVoterAnswers(persona), candidates)
  for (const level of LEVEL_ORDER) {
    const races = result.races.filter(r => r.level === level)
    if (!races.length) continue
    console.log(`  ── ${level.toUpperCase().replace('_', ' ')} ──`)
    for (const race of races) {
      const sorted = [...race.candidates].sort((a, b) => b.matchPercent - a.matchPercent)
      const line = sorted.map(c => `${c.name.split(' ').slice(-1)[0]} (${c.party[0]}) ${Math.round(c.matchPercent)}%`).join('  ·  ')
      console.log(`    ${race.race.substring(0, 44).padEnd(46)} ${line}`)
    }
  }
}
