/**
 * scaleDirections.js — per-question scale normalization map
 *
 * The candidate dataset codes every topic with 5 = conservative position.
 * The quiz questions, however, were written with independently-oriented
 * scales (deliberately varied wording, some 5 = progressive, some 5 =
 * conservative). Before voter answers can be compared to candidate scores,
 * each answer must be normalized into the candidate convention.
 *
 * "inverted"  — question's 5-label corresponds to candidate score 1 → flip (6 - answer)
 * "aligned"   — question's 5-label corresponds to candidate score 5 → keep as-is
 *
 * Derived from a forensic audit (June 2026) comparing each question's
 * scale_high_label against the positions/summaries of ideologically
 * well-anchored candidates (Paxton, Talarico, Abbott, Hinojosa, Patrick,
 * Eads, Pappas) in candidates.json.
 *
 * 14c (parks spending) lacks a clean ideological anchor in the candidate
 * data; treated as aligned pending a question rewrite.
 */

export const QUESTION_DIRECTIONS = {
  '1a': 'inverted', '1b': 'inverted', '1c': 'inverted',
  '2a': 'aligned',  '2b': 'aligned',  '2c': 'aligned',
  '3a': 'inverted', '3b': 'aligned',  '3c': 'inverted',
  '4a': 'inverted', '4b': 'inverted', '4c': 'inverted',
  '5a': 'inverted', '5b': 'inverted', '5c': 'inverted',
  '6a': 'inverted', '6b': 'inverted', '6c': 'aligned',
  '7a': 'inverted', '7b': 'inverted', '7c': 'aligned',
  '8a': 'inverted', '8b': 'inverted', '8c': 'inverted',
  '9a': 'inverted', '9b': 'inverted', '9c': 'inverted',
  '10a': 'inverted', '10b': 'inverted', '10c': 'aligned',
  '11a': 'inverted', '11b': 'inverted', '11c': 'inverted',
  '12a': 'inverted', '12b': 'inverted', '12c': 'aligned',
  '13a': 'aligned',  '13b': 'inverted', '13c': 'aligned',
  '14a': 'inverted', '14b': 'inverted', '14c': 'aligned',
  '15a': 'inverted', '15b': 'aligned',  '15c': 'inverted',
  '16a': 'inverted', '16b': 'inverted', '16c': 'inverted',
}

/**
 * Normalize a raw quiz answer (1-5, per on-screen labels) into the
 * candidate-data convention (5 = conservative) for matching.
 */
export function normalizeAnswer(questionId, answer) {
  if (answer == null) return answer
  return QUESTION_DIRECTIONS[questionId] === 'inverted' ? 6 - answer : answer
}
