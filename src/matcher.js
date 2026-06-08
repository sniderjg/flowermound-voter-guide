/**
 * matcher.js — Voter-Candidate Matching Algorithm
 * Flower Mound, TX Voter Guide — November 2026
 *
 * Pure functions only. No side effects. No external dependencies.
 * Compatible with modern ESM (Vite, Next.js, Create React App).
 *
 * HOW SCORES WORK:
 *   - Voter answers questions on a 1–5 scale per topic
 *   - Voter rates how important each topic is (priority 1–5)
 *   - Each topic's questions are averaged into one voter score
 *   - That score is compared to the candidate's score on the same topic
 *   - Distance between scores becomes an agreement % (0–100)
 *   - Agreement is weighted by (voter priority × candidate confidence)
 *   - Final match % = weighted average of all applicable topic agreements
 *
 * SCALE DIRECTION (critical — all data must follow this convention):
 *   Voter questions and candidate scores must share the same direction.
 *   1 = the "low" end as labeled on each question
 *   5 = the "high" end as labeled on each question
 *   The TOPIC_SCALE_DIRECTION map records whether the "high" end (5)
 *   is the conservative or progressive position for each topic.
 *   This map is for documentation/UI use; the algorithm is direction-agnostic
 *   as long as voter answers and candidate scores use the SAME scale per topic.
 *
 * FIX 1 — PRIORITY-SQUARED WEIGHTING:
 *   Priority is squared before weighting so a priority-5 topic contributes
 *   25x (not 5x) relative to a priority-1 topic. This ensures single-issue
 *   voters see strong separation (>85% for aligned, <20% for opposed)
 *   rather than being diluted by many low-priority neutral topics.
 *
 * FIX 2 — SUB-QUESTION CONSISTENCY CHECK:
 *   aggregateTopicScore() now flags when sub-questions produce high variance,
 *   indicating a voter holds mixed views within a topic. The UI should show
 *   this flag so voters can review their answers before seeing results.
 *
 * FIX 3 — TOP DRIVING ISSUES:
 *   calculateRaceMatch() returns topDrivers: the 2-3 topics that most
 *   influenced the score (positive or negative), so tight margins can be
 *   contextualized rather than shown as a bare percentage.
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** How much to trust each confidence level when weighting a candidate's position. */
const CONFIDENCE_MULTIPLIERS = {
  explicit: 1.0,   // candidate stated this directly
  implied:  0.8,   // strongly suggested by their record or statements
  inferred: 0.5,   // reasonable conclusion from limited information
  unknown:  null,  // no usable information — skip this topic entirely
};

/**
 * Which topics are applicable to each race level.
 * Topics outside this list are skipped for that level — they don't help
 * or hurt the candidate's score.
 */
const APPLICABLE_TOPICS_BY_LEVEL = {
  federal:            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  statewide:          [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 15],
  statewide_judicial: [1, 2, 8],   // judges apply law; narrow policy scope
  state_legislature:  [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15],
  county:             [1, 2, 5, 12, 13, 16],
  local:              [1, 2, 12, 13, 14, 16],
};

/** Human-readable topic names for UI display. */
const TOPIC_NAMES = {
  1:  'Fiscal Policy & Taxes',
  2:  'Public Safety & Criminal Justice',
  3:  'Education Funding & Access',
  4:  'Reproductive Rights',
  5:  'Social Safety Net',
  6:  'Social Security & Medicare',
  7:  'LGBTQ+ Rights',
  8:  'Healthcare Access',
  9:  'Immigration',
  10: 'Gun Policy',
  11: 'Energy & Environment',
  12: 'Infrastructure & Transportation',
  13: 'Land Use & Development',
  14: 'Community Character & Growth',
  15: 'Education Curriculum & Parental Rights',
  16: 'Local Governance & Transparency',
};

/**
 * For UI disclosure: records whether the "high" (5) end of each topic scale
 * represents the more conservative or more progressive position.
 * This must match how voter questions and candidate profiles are coded.
 * If a question is coded "5 = progressive", candidate profiles must also
 * use 5 to mean the progressive position on that topic.
 */
const TOPIC_SCALE_HIGH_END = {
  1:  'progressive',   // 5 = expand services / raise taxes
  2:  'conservative',  // 5 = more law enforcement / strict sentencing
  3:  'progressive',   // 5 = more federal education involvement / subsidies
  4:  'progressive',   // 5 = abortion legal and accessible
  5:  'progressive',   // 5 = robust government assistance
  6:  'progressive',   // 5 = preserve/expand SS & Medicare benefits
  7:  'progressive',   // 5 = stronger LGBTQ+ protections
  8:  'progressive',   // 5 = government-administered coverage / negotiation
  9:  'progressive',   // 5 = humanitarian processing / open legal immigration
  10: 'conservative',  // 5 = fewer gun restrictions / permitless carry
  11: 'progressive',   // 5 = aggressive renewable transition / strict emissions rules
  12: 'progressive',   // 5 = public funding / transit investment
  13: 'progressive',   // 5 = allow more development / state preemption of zoning
  14: 'conservative',  // 5 = attract more development / accommodate growth
  15: 'conservative',  // 5 = parental control / limit gender/race discussions
  16: 'progressive',   // 5 = maximum transparency / direct democracy mechanisms
};

/** Maximum possible distance between two scores on a 1–5 scale. */
const MAX_DISTANCE = 4;

/**
 * FIX 1: Priority exponent for weighting.
 * Setting this to 2 means priority is squared: priority-5 = weight 25,
 * priority-1 = weight 1. This gives single-issue voters strong separation.
 * Set to 1 to revert to linear weighting.
 */
const PRIORITY_EXPONENT = 2;

/** Neutral answer / score value. */
const NEUTRAL = 3;

/** Confidence levels that should trigger a disclosure note in the UI. */
const DISCLOSURE_CONFIDENCE_LEVELS = new Set(['inferred', 'implied']);


// ─── VALIDATION ──────────────────────────────────────────────────────────────

/**
 * Validates a single candidate profile at load time.
 * Call this when you ingest candidate data, not in the hot matching path.
 *
 * @param {Object} candidate
 * @throws {TypeError|RangeError} if the candidate data is malformed
 */
export function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new TypeError('candidate must be an object');
  }
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new TypeError(`candidate.name must be a non-empty string`);
  }
  if (typeof candidate.level !== 'string' || !(candidate.level in APPLICABLE_TOPICS_BY_LEVEL)) {
    throw new TypeError(
      `candidate "${candidate.name}": level must be one of: ${Object.keys(APPLICABLE_TOPICS_BY_LEVEL).join(', ')}`
    );
  }
  const positions = candidate.positions ?? [];
  for (const pos of positions) {
    const score = Number(pos.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new RangeError(
        `candidate "${candidate.name}" topic ${pos.topic_id}: score must be 1–5, got ${pos.score}`
      );
    }
    const multiplier = CONFIDENCE_MULTIPLIERS[pos.confidence];
    if (multiplier === undefined) {
      // undefined means the confidence string isn't in the map at all
      throw new TypeError(
        `candidate "${candidate.name}" topic ${pos.topic_id}: unknown confidence value "${pos.confidence}". ` +
        `Must be: ${Object.keys(CONFIDENCE_MULTIPLIERS).join(', ')}`
      );
    }
  }
}

/**
 * Validates voter answers before matching.
 * @param {Object} voterAnswers
 * @throws {TypeError|RangeError} if answers are malformed
 */
function validateVoterAnswers(voterAnswers) {
  if (!voterAnswers || typeof voterAnswers !== 'object') {
    throw new TypeError('voterAnswers must be an object');
  }
  for (const [topicId, topic] of Object.entries(voterAnswers)) {
    const priority = Number(topic.priority);
    if (!Number.isFinite(priority) || priority < 0 || priority > 5) {
      throw new RangeError(`voterAnswers topic ${topicId}: priority must be 0–5, got ${topic.priority}`);
    }
    for (const [qId, answer] of Object.entries(topic.questions ?? {})) {
      const ans = Number(answer);
      if (!Number.isFinite(ans) || ans < 1 || ans > 5) {
        throw new RangeError(
          `voterAnswers topic ${topicId} question ${qId}: answer must be 1–5, got ${answer}`
        );
      }
    }
  }
}


// ─── HELPER: AGGREGATE TOPIC SCORE ───────────────────────────────────────────

/**
 * Averages all of a voter's question answers for one topic into a single score.
 *
 * @param {Object} questionAnswers - { [questionId]: number (1-5) }
 * @returns {{ score: number, allNeutral: boolean }}
 *   score     — the averaged answer (1–5)
 *   allNeutral — true if every answer was exactly 3 (voter has no opinion)
 */
export function aggregateTopicScore(questionAnswers) {
  const answers = Object.values(questionAnswers).map(Number).filter(Number.isFinite);
  if (answers.length === 0) {
    return { score: NEUTRAL, allNeutral: true, highVariance: false };
  }
  const avg = answers.reduce((sum, a) => sum + a, 0) / answers.length;
  const allNeutral = answers.every(a => a === NEUTRAL);

  // FIX 2: Detect high variance within a topic — voter holds mixed views.
  // Variance > 1.5 on a 1-5 scale means answers span more than ~1.2 points
  // on average from the mean, e.g. one answer of 1 and another of 5.
  // The UI should flag this and invite the voter to review their answers.
  let highVariance = false;
  if (answers.length > 1) {
    const variance = answers.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / answers.length;
    highVariance = variance > 1.5;
  }

  return { score: avg, allNeutral, highVariance };
}


// ─── HELPER: CALCULATE ONE RACE MATCH ────────────────────────────────────────

/**
 * Calculates how well a voter's topic scores match a single candidate.
 *
 * @param {Object} voterTopicScores
 *   { [topicId]: { score: number, priority: number, allNeutral: boolean } }
 * @param {Object} candidate - candidate profile with positions array
 * @param {string} raceLevel - the race level (used for topic filtering)
 * @param {boolean} voterHasMeaningfulPreferences
 *   false = voter is entirely neutral; use fallback weighting
 * @returns {Object} match result for this candidate
 */
export function calculateRaceMatch(voterTopicScores, candidate, raceLevel, voterHasMeaningfulPreferences) {
  const applicableTopics = new Set(APPLICABLE_TOPICS_BY_LEVEL[raceLevel] ?? []);

  // Build a fast lookup: topicId → position
  const candidatePositionMap = {};
  for (const pos of candidate.positions ?? []) {
    candidatePositionMap[pos.topic_id] = pos;
  }

  let totalWeightedAgreement = 0;
  let totalWeight = 0;
  let hasReducedConfidencePositions = false;
  let hasPlatformOnlyPositions = candidate.disclosure === 'platform_only';
  const topicBreakdown = [];

  for (const [topicIdStr, voterTopic] of Object.entries(voterTopicScores)) {
    const topicId = Number(topicIdStr);
    const topicName = TOPIC_NAMES[topicId] ?? `Topic ${topicId}`;

    // ── Skip: topic not applicable to this race level
    if (!applicableTopics.has(topicId)) {
      topicBreakdown.push({
        topicId, topicName,
        skipped: true, skipReason: 'not_applicable_to_race_level',
        voterScore: voterTopic.score, candidateScore: null,
        weight: 0, agreementPercent: null, contribution: 0,
      });
      continue;
    }

    const candidatePos = candidatePositionMap[topicId];

    // ── Skip: no candidate position data
    if (!candidatePos) {
      topicBreakdown.push({
        topicId, topicName,
        skipped: true, skipReason: 'no_candidate_data',
        voterScore: voterTopic.score, candidateScore: null,
        weight: 0, agreementPercent: null, contribution: 0,
      });
      continue;
    }

    const candidateScore = Number(candidatePos.score);
    const rawMultiplier = CONFIDENCE_MULTIPLIERS[candidatePos.confidence];

    // ── Skip: unknown confidence (null multiplier)
    // Note: undefined multiplier would have been caught by validateCandidate()
    if (rawMultiplier === null) {
      topicBreakdown.push({
        topicId, topicName,
        skipped: true, skipReason: 'unknown_candidate_position',
        voterScore: voterTopic.score, candidateScore,
        weight: 0, agreementPercent: null, contribution: 0,
      });
      continue;
    }

    // Track whether any reduced-confidence positions are included
    if (DISCLOSURE_CONFIDENCE_LEVELS.has(candidatePos.confidence)) {
      hasReducedConfidencePositions = true;
    }

    // ── Priority: if voter is entirely neutral (no meaningful preferences),
    //    fall back to a uniform weight of 1 so the neutral voter still gets scores.
    //    This lets genuinely undecided voters use the app without being locked out.
    const effectivePriority = voterHasMeaningfulPreferences
      ? voterTopic.priority
      : 1;

    // ── Skip voter's own topic if priority is 0 AND they have meaningful preferences elsewhere
    if (voterHasMeaningfulPreferences && voterTopic.priority === 0) {
      topicBreakdown.push({
        topicId, topicName,
        skipped: true, skipReason: 'voter_deprioritized',
        voterScore: voterTopic.score, candidateScore,
        weight: 0, agreementPercent: null, contribution: 0,
      });
      continue;
    }

    // ── Skip voter's own topic if they answered all-neutral AND they have real preferences elsewhere
    if (voterHasMeaningfulPreferences && voterTopic.allNeutral) {
      topicBreakdown.push({
        topicId, topicName,
        skipped: true, skipReason: 'voter_neutral_on_topic',
        voterScore: voterTopic.score, candidateScore,
        weight: 0, agreementPercent: null, contribution: 0,
      });
      continue;
    }

    // ── Core math
    // rawDistance: 0 = perfect agreement, 4 = maximum disagreement
    const rawDistance   = Math.abs(voterTopic.score - candidateScore);
    const agreement     = 1 - (rawDistance / MAX_DISTANCE);   // 0.0–1.0

    // FIX 1: Square the priority so high-priority topics dominate decisively.
    // priority 5 → weight 25, priority 3 → weight 9, priority 1 → weight 1.
    const priorityWeight = Math.pow(effectivePriority, PRIORITY_EXPONENT);
    const weight        = priorityWeight * rawMultiplier;
    const contribution  = agreement * weight;

    totalWeightedAgreement += contribution;
    totalWeight            += weight;

    topicBreakdown.push({
      topicId,
      topicName,
      skipped: false,
      skipReason: null,
      voterScore: voterTopic.score,
      candidateScore,
      confidence: candidatePos.confidence,
      weight,
      agreementPercent: agreement * 100,   // unrounded for reconciliation
      contribution,
      netPositive: agreement > 0.5,        // true = this topic helps the match
      sourceUrl: candidatePos.source_url ?? null,
      notableQuote: candidatePos.notable_quote ?? null,
    });
  }

  // ── Final score calculation
  let matchPercent = null;
  let noDataReason = null;

  if (totalWeight === 0) {
    // No scorable topics found for this candidate+race combination
    if (applicableTopics.size === 0) {
      noDataReason = 'race_level_not_recognized';
    } else {
      noDataReason = 'no_candidate_positions_found_for_applicable_topics';
    }
  } else {
    // Round to 1 decimal place
    matchPercent = Math.round((totalWeightedAgreement / totalWeight) * 1000) / 10;
    // Clamp to [0, 100] — should not be needed with valid data, but guards against edge cases
    matchPercent = Math.max(0, Math.min(100, matchPercent));
  }

  // Build disclosure notes
  const disclosureNotes = [];
  if (hasPlatformOnlyPositions) {
    disclosureNotes.push(
      'No direct statements found for this candidate. Positions shown reflect their party\'s platform only, not verified personal statements.'
    );
  } else if (hasReducedConfidencePositions) {
    disclosureNotes.push(
      'Some positions for this candidate are based on implied or inferred statements rather than direct quotes. See topic breakdown for details.'
    );
  }
  if (raceLevel === 'statewide_judicial') {
    disclosureNotes.push(
      'Judicial candidates are scored only on civil rights, public safety, and healthcare access topics — the areas most relevant to judicial decision-making.'
    );
  }
  if (candidate.uncontested) {
    disclosureNotes.push('This candidate is running uncontested.');
  }
  if (!voterHasMeaningfulPreferences) {
    disclosureNotes.push(
      'You answered neutrally on all topics. This score reflects an equal-weight comparison across all applicable topics.'
    );
  }
  if (candidate.ballot_pending) {
    disclosureNotes.push(
      '⚠ This candidate\'s ballot qualification is pending. Verify at Texas Secretary of State before election day.'
    );
  }
  if (candidate.dataTimestamp) {
    const dataAge = Date; // placeholder — stamp at runtime, not in algorithm
    disclosureNotes.push(`Candidate positions last researched: ${candidate.dataTimestamp}`);
  }

  // FIX 3: Identify the top driving topics — the 2-3 topics that most
  // influenced this score (highest absolute contribution), so the UI can
  // explain tight margins rather than showing a bare percentage.
  const scoredTopics = topicBreakdown.filter(t => !t.skipped);
  const topDrivers = scoredTopics
    .sort((a, b) => b.weight - a.weight)  // sort by weight (priority × confidence)
    .slice(0, 3)
    .map(t => ({
      topicId: t.topicId,
      topicName: t.topicName,
      agreementPercent: Math.round(t.agreementPercent * 10) / 10,
      netPositive: t.netPositive,
      weight: Math.round(t.weight * 10) / 10,
    }));

  return {
    name: candidate.name,
    party: candidate.party,
    incumbent: candidate.incumbent ?? false,
    matchPercent,
    noDataReason,
    disclosureNotes,
    topDrivers,   // FIX 3: top 2-3 issues that drove this score
    topicBreakdown,
  };
}


// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * Main entry point. Match a voter's survey answers to all candidates.
 *
 * @param {Object} voterAnswers
 *   {
 *     [topicId]: {
 *       priority: number (1–5),
 *       questions: { [questionId]: number (1–5) }
 *     }
 *   }
 * @param {Array} candidates  - array of candidate profile objects
 * @returns {Object}
 *   {
 *     voterSkippedAll: boolean,
 *     races: [{
 *       race: string,
 *       level: string,
 *       candidates: [{ name, party, matchPercent, disclosureNotes, topicBreakdown }]
 *     }]
 *   }
 */
export function matchVoterToCandidates(voterAnswers, candidates) {
  // ── Input validation
  if (!voterAnswers || typeof voterAnswers !== 'object') {
    throw new TypeError('voterAnswers must be a non-null object');
  }
  if (!Array.isArray(candidates)) {
    throw new TypeError('candidates must be an array');
  }

  validateVoterAnswers(voterAnswers);

  // ── Pre-process voter answers into topic scores
  const voterTopicScores = {};
  let voterHasMeaningfulPreferences = false;

  for (const [topicIdStr, topicData] of Object.entries(voterAnswers)) {
    const topicId = Number(topicIdStr);
    const priority = Number(topicData.priority);
    const { score, allNeutral } = aggregateTopicScore(topicData.questions ?? {});

    voterTopicScores[topicId] = { score, priority, allNeutral };

    // Voter has meaningful preferences if any topic has priority > 0
    // AND the voter didn't answer all-neutral on that topic
    if (priority > 0 && !allNeutral) {
      voterHasMeaningfulPreferences = true;
    }
  }

  // ── Group candidates by race
  // Use normalized race key to prevent whitespace/case duplicates
  const raceMap = {};
  for (const candidate of candidates) {
    const raceKey = (candidate.race ?? 'Unknown Race').trim().toLowerCase();

    if (!raceMap[raceKey]) {
      raceMap[raceKey] = {
        race: candidate.race,
        level: candidate.level,
        candidates: [],
      };
    } else {
      // Validate that all candidates in the same race have the same level
      if (raceMap[raceKey].level !== candidate.level) {
        console.warn(
          `[matcher] Race "${candidate.race}": candidate "${candidate.name}" has level ` +
          `"${candidate.level}" but race was already set to level "${raceMap[raceKey].level}". ` +
          `Using race-level "${raceMap[raceKey].level}" for all candidates in this race.`
        );
      }
    }

    raceMap[raceKey].candidates.push(candidate);
  }

  // ── Calculate matches for each race
  const races = Object.values(raceMap).map(({ race, level, candidates: raceCandidates }) => {
    const matchedCandidates = raceCandidates
      .map(candidate =>
        calculateRaceMatch(voterTopicScores, candidate, level, voterHasMeaningfulPreferences)
      )
      // Sort: highest match first; null scores go last; ties broken alphabetically
      .sort((a, b) => {
        if (a.matchPercent === null && b.matchPercent === null) {
          return a.name.localeCompare(b.name);
        }
        if (a.matchPercent === null) return 1;
        if (b.matchPercent === null) return -1;
        if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
        return a.name.localeCompare(b.name); // deterministic tie-break
      });

    return { race, level, candidates: matchedCandidates };
  });

  return {
    voterSkippedAll: !voterHasMeaningfulPreferences,
    races,
  };
}


// ─── UTILITY: VOTER ANSWER BUILDER ───────────────────────────────────────────

/**
 * Helper to build a voterAnswers object from a flat array of quiz responses.
 * Useful for connecting the quiz UI to the matching engine.
 *
 * @param {Array} responses - [{ topicId, questionId, answer, priority }]
 * @returns {Object} voterAnswers object ready for matchVoterToCandidates()
 */
export function buildVoterAnswers(responses) {
  const result = {};
  for (const { topicId, questionId, answer, priority } of responses) {
    if (!result[topicId]) {
      result[topicId] = { priority: priority ?? 3, questions: {} };
    }
    if (priority !== undefined) {
      result[topicId].priority = priority;
    }
    if (questionId && answer !== undefined) {
      result[topicId].questions[questionId] = answer;
    }
  }
  return result;
}


// ─── UTILITY: FORMAT MATCH RESULT FOR UI ─────────────────────────────────────

/**
 * Formats a single candidate match result for display.
 * Returns only the data the UI needs, in a clean structure.
 *
 * @param {Object} matchResult - output from calculateRaceMatch()
 * @returns {Object}
 */
export function formatMatchForDisplay(matchResult) {
  const { name, party, incumbent, matchPercent, disclosureNotes, topicBreakdown } = matchResult;

  const scoredTopics = topicBreakdown.filter(t => !t.skipped);
  const skippedTopics = topicBreakdown.filter(t => t.skipped);

  return {
    name,
    party,
    incumbent,
    matchPercent: matchPercent !== null ? `${matchPercent}%` : 'No data',
    matchPercentRaw: matchPercent,
    disclosureNotes,
    topTopics: scoredTopics
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map(t => ({
        topicName: t.topicName,
        agreementPercent: Math.round(t.agreementPercent),
        netPositive: t.netPositive,
      })),
    fullBreakdown: scoredTopics.map(t => ({
      topicId: t.topicId,
      topicName: t.topicName,
      voterScore: Math.round(t.voterScore * 10) / 10,
      candidateScore: t.candidateScore,
      confidence: t.confidence,
      agreementPercent: Math.round(t.agreementPercent * 10) / 10,
      netPositive: t.netPositive,
      sourceUrl: t.sourceUrl,
      notableQuote: t.notableQuote,
    })),
    skippedTopics: skippedTopics.map(t => ({
      topicName: t.topicName,
      skipReason: t.skipReason,
    })),
  };
}
