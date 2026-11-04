/**
 * The copilot console is single-turn on the server: each request carries one
 * `message` string and nothing else. To keep a conversation going, the page
 * folds the earlier exchanges into that string.
 *
 * Only completed turns are included. The budget keeps the message well inside
 * what the server will accept; when the thread is longer, the oldest turns are
 * dropped first and the most recent exchanges are kept.
 */

export interface HistoryTurn {
  question: string
  answer: { reply: string } | null
  error: string | null
  pending: boolean
}

export const HISTORY_CHAR_BUDGET = 12000

export function buildMessageWithHistory(
  turns: HistoryTurn[],
  question: string,
  budget: number = HISTORY_CHAR_BUDGET
): string {
  const completed = turns
    .filter((turn) => !turn.pending && !turn.error && turn.answer !== null)
    .map((turn) => ({
      question: turn.question,
      reply: turn.answer?.reply ?? "",
    }))

  // Walk backwards so the newest exchanges survive when the budget runs out.
  const kept: string[] = []
  let used = 0
  for (let i = completed.length - 1; i >= 0; i--) {
    const block = `User: ${completed[i].question}\nAssistant: ${completed[i].reply}`
    if (used + block.length > budget) break
    kept.unshift(block)
    used += block.length + 2
  }

  if (kept.length === 0) return question

  return `Conversation so far:\n\n${kept.join("\n\n")}\n\nCurrent question from the user:\n${question}`
}
