/**
 * matcher.js
 * Voter-Candidate Matching Algorithm
 *
 * This module calculates how closely a voter's policy preferences align with
 * each candidate running in their races. The math is intentionally transparent
 * so voters can understand exactly why they received a particular match score.
 *
 * All functions are pure — they take inputs and return outputs without
 * modifying anything outside themselves. This makes the algorithm easy to
 * test and audit.
 */

"use strict";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * How much we trust each type of candidate position.
 * "explicit" means the candidate stated this position directly.
 * "implied" means it follows clearly from related statements.
 * "inferred" means we drew a reasonable conclusion from limited information.
 * "unknown" means we have no usable information — we skip rather than guess.
 */
const CONFIDENCE_MULTIPLIERS = {
  explicit: 1.0,
  implied: 0.8,
  inferred: 0.5,
  unknown: null, // signals "skip this topic"
};

/**
 * Which policy topics apply to each level of government.
 * A topic not listed for a race level is simply skipped — it would be unfair
 * to score a county judge on federal trade policy, for example.
 *
 * Topic IDs 1-16 correspond to the app's full topic list.
 */
const APPLICABLE_TOPICS_BY_LEVEL = {
  federal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  statewide: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15],
  statewide_judicial: [1, 2, 8],
  state_legislature: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15],
  county: [1, 2, 5, 12, 13, 16],
  local: [1, 2, 12, 13, 14, 16],
};

// The maximum possible distance between two scores on a 1-5 scale is 4.
// We use this to convert a raw gap into a 0-to-1 range.
const MAX_SCORE_DISTANCE = 4;

// ---------------------------------------------------------------------------
// HELPER: AGGREGATE VOTER TOPIC SCORE
// ---------------------------------------------------------------------------

/**
 * Averages a voter's individual question answers within a single topic.
 *
 * On the survey, each policy topic may have multiple questions. For example,
 * the "economy" topic might ask about taxes, trade, and minimum wage separately.
 * This function collapses those answers into one representative score for
 * the topic as a whole.
 *
 * @param {Object.<string, number>} questionAnswers
 *   An object mapping questionId -> answer (1-5), where 3 = neutral/no opinion.
 *
 * @returns {{ score: number, allNeutral: boolean }}
 *   score     — the averaged answer (1.0 to 5.0)
 *   allNeutral — true when every answer was exactly 3 (neutral), which signals
 *                that this topic should be skipped during matching
 *
 * @example
 *   aggregateTopicScore({ q1: 4, q2: 5, q3: 4 })
 *   // => { score: 4.333, allNeutral: false }
 *
 *   aggregateTopicScore({ q1: 3, q2: 3 })
 *   // => { score: 3, allNeutral: true }
 */
function aggregateTopicScore(questionAnswers) {
  const answers = Object.values(questionAnswers);

  if (answers.length === 0) {
    // No questions answered — treat as fully neutral
    return { score: 3, allNeutral: true };
  }

  const total = answers.reduce((sum, answer) => sum + answer, 0);
  const score = total / answers.length;

  // A topic is "all neutral" only when every single answer was the midpoint (3).
  // Per the spec, this means the voter has no opinion on this topic and we
  // should treat its priority as 0 (skip it).
  const allNeutral = answers.every((answer) => answer === 3);

  return { score, allNeutral };
}

// ---------------------------------------------------------------------------
// HELPER: CALCULATE MATCH FOR ONE CANDIDATE IN ONE RACE
// ---------------------------------------------------------------------------

/**
 * Computes a single candidate's match percentage against a voter's preferences
 * for a specific race level.
 *
 * The approach:
 *   1. For each policy topic, determine how close the voter and candidate are
 *      on a 0-to-1 agreement scale.
 *   2. Weight that agreement by (a) how important the topic is to the voter
 *      and (b) how confident we are in the candidate's position.
 *   3. Sum the weighted agreements and divide by the sum of weights to get
 *      a final percentage.
 *
 * @param {Object.<string, { score: number, priority: number, allNeutral: boolean }>} voterTopicScores
 *   Keyed by topicId. Each entry has:
 *     score      — the averaged voter answer for this topic (1-5)
 *     priority   — how important this topic is to the voter (1-5)
 *     allNeutral — whether the voter expressed no opinion (skip if true)
 *
 * @param {{ name: string, party: string, positions: Array }} candidate
 *   The candidate profile. positions is an array of:
 *     { topic_id, score, confidence }
 *
 * @param {string} raceLevel
 *   One of: 'federal', 'statewide', 'statewide_judicial', 'state_legislature',
 *           'county', 'local'
 *
 * @returns {{
 *   matchPercent: number|null,
 *   topicBreakdown: Array,
 *   disclosure: string
 * }}
 */
function calculateRaceMatch(voterTopicScores, candidate, raceLevel) {
  // Look up which topics are relevant to this level of government.
  const applicableTopicIds = APPLICABLE_TOPICS_BY_LEVEL[raceLevel];

  if (!applicableTopicIds) {
    return {
      matchPercent: null,
      topicBreakdown: [],
      disclosure: `Unknown race level "${raceLevel}" — cannot calculate match.`,
    };
  }

  // Build a quick lookup: topicId -> candidate position
  const candidatePositionMap = {};
  for (const position of candidate.positions) {
    candidatePositionMap[String(position.topic_id)] = position;
  }

  // These accumulators track the weighted sum of agreements and the total
  // weight. Dividing them at the end gives us the final match percentage.
  let totalWeightedAgreement = 0;
  let totalWeight = 0;

  // Track whether any position relied on inferred data or platform-only info,
  // so we can show an appropriate disclosure note to the voter.
  let hasInferredPositions = false;

  // Detailed breakdown for the transparency UI
  const topicBreakdown = [];

  for (const topicId of applicableTopicIds) {
    const topicKey = String(topicId);
    const voterTopic = voterTopicScores[topicKey];

    // If the voter didn't weigh in on this topic at all, skip it.
    if (!voterTopic) continue;

    // Per the spec: if the voter answered neutral (3) on every question in
    // this topic, treat the priority as 0 and skip this topic.
    if (voterTopic.allNeutral) continue;

    // A priority of 0 also means "voter doesn't care" — skip.
    if (voterTopic.priority === 0) continue;

    const candidatePosition = candidatePositionMap[topicKey];

    // If we have no position at all for this candidate on this topic,
    // treat it the same as "unknown" — skip rather than penalize.
    if (!candidatePosition) continue;

    const confidenceMultiplier =
      CONFIDENCE_MULTIPLIERS[candidatePosition.confidence];

    // "unknown" confidence means we have no usable data — skip this topic
    // entirely. We do NOT penalize the candidate for topics we can't measure.
    if (confidenceMultiplier === null) continue;

    if (candidatePosition.confidence === "inferred") {
      hasInferredPositions = true;
    }

    // --- THE CORE MATH ---
    //
    // Step 1: How far apart are the voter and candidate on this topic?
    //   Scores run 1-5, so the maximum possible gap is 4 points.
    const rawDistance = Math.abs(
      voterTopic.score - candidatePosition.score
    );

    // Step 2: Normalize that gap to a 0-to-1 range.
    //   0.0 = perfectly aligned, 1.0 = completely opposed
    const normalizedDistance = rawDistance / MAX_SCORE_DISTANCE;

    // Step 3: Flip it so that 1.0 = perfect match, 0.0 = total disagreement.
    const agreement = 1 - normalizedDistance;

    // Step 4: Combine the voter's stated priority with how confident we are
    //   in the candidate's position. A topic the voter cares deeply about
    //   (priority 5) and for which the candidate has an explicit statement
    //   carries the most weight. A topic the voter rates low (priority 1)
    //   or for which we only have inferred data carries less.
    const weight = voterTopic.priority * confidenceMultiplier;

    // Step 5: Multiply agreement by weight for this topic's contribution.
    const contribution = agreement * weight;

    // Accumulate
    totalWeightedAgreement += contribution;
    totalWeight += weight;

    // Record for the UI breakdown
    topicBreakdown.push({
      topicId,
      voterScore: voterTopic.score,
      candidateScore: candidatePosition.score,
      confidence: candidatePosition.confidence,
      confidenceMultiplier,
      voterPriority: voterTopic.priority,
      weight,
      agreement,
      agreementPercent: Math.round(agreement * 100),
      contribution,
      // "helped" means the voter and candidate are more aligned than not
      helpsMatch: agreement >= 0.5,
    });
  }

  // Edge case: no topics contributed any weight.
  // This can happen for judicial candidates with all-unknown positions,
  // or any candidate where every applicable topic was skipped.
  if (totalWeight === 0) {
    let disclosure =
      "No scorable topics found — match percentage unavailable.";
    if (raceLevel === "statewide_judicial") {
      disclosure =
        "Judicial candidates are assessed on limited policy topics (civil rights, criminal justice, individual rights only). Insufficient position data to calculate a match.";
    }
    return {
      matchPercent: null,
      topicBreakdown: [],
      disclosure,
    };
  }

  // --- FINAL SCORE ---
  // The weighted average of all agreements, expressed as a percentage.
  const rawMatchPercent = (totalWeightedAgreement / totalWeight) * 100;

  // Round to one decimal place for display.
  const matchPercent = Math.round(rawMatchPercent * 10) / 10;

  // Build any disclosure note needed.
  let disclosure = "";
  if (hasInferredPositions) {
    disclosure =
      "One or more of this candidate's positions was inferred from limited information and carried reduced weight in the calculation.";
  }

  if (candidate.disclosure === "platform_only") {
    const platformNote =
      "This candidate's positions are based on platform statements only and have not been verified through voting record or direct statements.";
    disclosure = disclosure
      ? `${disclosure} ${platformNote}`
      : platformNote;
  }

  return {
    matchPercent,
    topicBreakdown,
    disclosure,
  };
}

// ---------------------------------------------------------------------------
// MAIN EXPORT: MATCH VOTER TO ALL CANDIDATES
// ---------------------------------------------------------------------------

/**
 * The top-level function. Given a voter's survey answers and a list of
 * candidate profiles, it returns a match percentage for every candidate
 * in every race.
 *
 * Results are organized by race so the UI can show them grouped naturally
 * (e.g., "U.S. Senate: Paxton 34% — Talarico 87%").
 *
 * @param {Object} voterAnswers
 *   Keyed by topicId (string). Each value:
 *   {
 *     priority: number (1-5),
 *     questions: { [questionId]: number (1-5) }
 *   }
 *
 * @param {Array} candidates
 *   Array of candidate profile objects, each with:
 *   {
 *     name: string,
 *     party: string,
 *     race: string,
 *     level: string,
 *     positions: [{ topic_id, score, confidence }]
 *   }
 *
 * @param {Object} [topicNameMap={}]
 *   Optional. Maps topicId -> human-readable topic name for the breakdown UI.
 *   Example: { "1": "Civil Rights & Equality", "2": "Criminal Justice" }
 *
 * @returns {{
 *   results: Array,
 *   voterSkippedAll: boolean
 * }}
 *
 *   results: array of race result objects, each:
 *   {
 *     race: string,
 *     level: string,
 *     uncontested: boolean,
 *     candidates: [{
 *       name, party, matchPercent,
 *       topicBreakdown, disclosure
 *     }]
 *   }
 *
 *   voterSkippedAll: true if the voter expressed no meaningful preferences
 *   at all (all priorities 0 or all answers neutral). In that case results
 *   will be empty.
 */
function matchVoterToCandidates(voterAnswers, candidates, topicNameMap = {}) {
  // ---------------------------------------------------------------------------
  // STEP 1: Pre-process the voter's answers into a flat topic-score map.
  //
  // Input shape:  { [topicId]: { priority, questions: { [qId]: 1-5 } } }
  // Output shape: { [topicId]: { score, priority, allNeutral } }
  // ---------------------------------------------------------------------------
  const voterTopicScores = {};
  let voterHasMeaningfulPreferences = false;

  for (const [topicId, topicData] of Object.entries(voterAnswers)) {
    const { score, allNeutral } = aggregateTopicScore(topicData.questions);

    // Per the spec: if the voter answered all-neutral on this topic,
    // treat priority as 0 regardless of what they entered.
    const effectivePriority = allNeutral ? 0 : (topicData.priority ?? 0);

    voterTopicScores[topicId] = {
      score,
      priority: effectivePriority,
      allNeutral,
      topicName: topicNameMap[topicId] || `Topic ${topicId}`,
    };

    if (effectivePriority > 0) {
      voterHasMeaningfulPreferences = true;
    }
  }

  // Edge case: voter expressed no meaningful preferences whatsoever.
  if (!voterHasMeaningfulPreferences) {
    return {
      results: [],
      voterSkippedAll: true,
      voterSkippedAllNote:
        "You answered neutral on all topics or set all priorities to zero. Please revisit your survey answers to receive match scores.",
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Group candidates by race.
  //
  // We process each race as a unit so we can flag uncontested races
  // and sort candidates by match percentage within the same race.
  // ---------------------------------------------------------------------------
  const raceMap = {};

  for (const candidate of candidates) {
    const raceKey = candidate.race;
    if (!raceMap[raceKey]) {
      raceMap[raceKey] = {
        race: candidate.race,
        level: candidate.level,
        candidates: [],
      };
    }
    raceMap[raceKey].candidates.push(candidate);
  }

  // ---------------------------------------------------------------------------
  // STEP 3: For each race, calculate every candidate's match percentage.
  // ---------------------------------------------------------------------------
  const results = [];

  for (const raceData of Object.values(raceMap)) {
    const { race, level, candidates: raceCandidates } = raceData;
    const isUncontested = raceCandidates.length === 1;

    const scoredCandidates = raceCandidates.map((candidate) => {
      const { matchPercent, topicBreakdown, disclosure } = calculateRaceMatch(
        voterTopicScores,
        candidate,
        level
      );

      // Enrich the topic breakdown with human-readable topic names
      const enrichedBreakdown = topicBreakdown.map((entry) => ({
        ...entry,
        topicName:
          topicNameMap[String(entry.topicId)] || `Topic ${entry.topicId}`,
      }));

      // Build the disclosure string, appending the uncontested note if needed
      let fullDisclosure = disclosure;
      if (isUncontested) {
        const uncontestedNote = "Running uncontested.";
        fullDisclosure = fullDisclosure
          ? `${fullDisclosure} ${uncontestedNote}`
          : uncontestedNote;
      }

      return {
        name: candidate.name,
        party: candidate.party,
        matchPercent,
        topicBreakdown: enrichedBreakdown,
        disclosure: fullDisclosure,
      };
    });

    // Sort candidates highest match to lowest (nulls go last)
    scoredCandidates.sort((a, b) => {
      if (a.matchPercent === null && b.matchPercent === null) return 0;
      if (a.matchPercent === null) return 1;
      if (b.matchPercent === null) return -1;
      return b.matchPercent - a.matchPercent;
    });

    results.push({
      race,
      level,
      uncontested: isUncontested,
      candidates: scoredCandidates,
    });
  }

  return {
    results,
    voterSkippedAll: false,
  };
}

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  matchVoterToCandidates,
  aggregateTopicScore,
  calculateRaceMatch,
  // Export constants so tests and UI code can reference them
  CONFIDENCE_MULTIPLIERS,
  APPLICABLE_TOPICS_BY_LEVEL,
};
