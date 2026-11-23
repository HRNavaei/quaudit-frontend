import { Question, Answer } from '../types';

/**
 * Maps each question to whether it is targeted as a follow-up by ANY question option.
 */
export const getIncomingFollowUpTargets = (questions: Question[]): Set<string> => {
  const targetedIds = new Set<string>();
  questions.forEach((q) => {
    (q.options || []).forEach((opt) => {
      if (opt.followUpQuestionId) {
        targetedIds.add(opt.followUpQuestionId);
      }
    });
  });
  return targetedIds;
};

/**
 * Checks if a specific question should be visible given current user answers.
 * - Root questions (not targeted by any option as a follow-up) are always visible.
 * - Follow-up questions are visible IF AND ONLY IF their parent option is actively selected.
 */
export const getVisibleQuestions = (
  questions: Question[],
  answers: Record<string, Partial<Answer>>
): Question[] => {
  const incomingTargets = getIncomingFollowUpTargets(questions);

  // Set of question IDs that are actively triggered by selected answers
  const activeTriggeredIds = new Set<string>();

  // Helper to activate follow-ups recursively
  const activateFollowUps = (questionId: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;

    const currentAns = answers[questionId];
    if (!currentAns) return;

    // Check selected option
    const selectedOptionId = currentAns.selectedOptionId;
    if (selectedOptionId && q.options) {
      const selectedOpt = q.options.find((o) => o.id === selectedOptionId);
      if (selectedOpt?.followUpQuestionId) {
        activeTriggeredIds.add(selectedOpt.followUpQuestionId);
        activateFollowUps(selectedOpt.followUpQuestionId);
      }
    }
  };

  // Start activating from root questions
  questions.forEach((q) => {
    if (!incomingTargets.has(q.id)) {
      activateFollowUps(q.id);
    }
  });

  // Filter questions: visible if it's a root question OR if it's in activeTriggeredIds
  return questions
    .filter((q) => !incomingTargets.has(q.id) || activeTriggeredIds.has(q.id))
    .sort((a, b) => a.order - b.order);
};

/**
 * DFS cycle detection to guarantee that questions do not form an infinite loop.
 */
export const detectCycle = (
  questions: Question[]
): { hasCycle: boolean; cyclePath?: string[] } => {
  const adj = new Map<string, string[]>();
  questions.forEach((q) => {
    const targets: string[] = [];
    (q.options || []).forEach((opt) => {
      if (opt.followUpQuestionId) {
        targets.push(opt.followUpQuestionId);
      }
    });
    adj.set(q.id, targets);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recStack.delete(nodeId);
    path.pop();
    return false;
  };

  for (const q of questions) {
    if (!visited.has(q.id)) {
      if (dfs(q.id)) {
        return { hasCycle: true, cyclePath: [...path] };
      }
    }
  }

  return { hasCycle: false };
};

/**
 * Returns questions that are valid targets for a follow-up link from sourceQuestionId.
 * A question cannot link to itself, and cannot link to any question that directly or indirectly
 * leads back to sourceQuestionId.
 */
export const getEligibleFollowUpTargets = (
  sourceQuestionId: string,
  questions: Question[]
): Question[] => {
  return questions.filter((q) => {
    if (q.id === sourceQuestionId) return false;

    // Check if adding an edge source -> q.id would cause a cycle
    const simulatedQuestions: Question[] = questions.map((item) => {
      if (item.id === sourceQuestionId) {
        return {
          ...item,
          options: (item.options || []).concat({
            id: 'temp-simulated-opt',
            label: 'sim',
            value: 'sim',
            order: 999,
            questionId: sourceQuestionId,
            followUpQuestionId: q.id,
          }),
        };
      }
      return item;
    });

    const cycle = detectCycle(simulatedQuestions);
    return !cycle.hasCycle;
  });
};

/**
 * Returns all question IDs in the follow-up chain starting from startQuestionId.
 */
export const getChainQuestionIds = (
  startQuestionId: string | null | undefined,
  allQuestions: Question[]
): string[] => {
  if (!startQuestionId) return [];
  const ids: string[] = [];
  const queue = [startQuestionId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (visited.has(currId)) continue;
    visited.add(currId);
    ids.push(currId);

    const currQ = allQuestions.find((q) => q.id === currId);
    if (currQ && currQ.options) {
      currQ.options.forEach((opt) => {
        if (opt.followUpQuestionId) {
          queue.push(opt.followUpQuestionId);
        }
      });
    }
  }

  return ids;
};
