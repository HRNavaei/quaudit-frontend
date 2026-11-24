import { assignmentsApi } from './assignments';
import { questionnairesApi } from './questionnaires';
import { QuestionnaireStats, QuestionStatItem } from '../types';

export const analyticsApi = {
  getQuestionnaireStats: async (questionnaireId: string): Promise<QuestionnaireStats | null> => {
    try {
      const [q, responsesData] = await Promise.all([
        questionnairesApi.getById(questionnaireId),
        assignmentsApi.getResponses(questionnaireId),
      ]);

      const allAssignments = await assignmentsApi.getAll({ questionnaireId });

      const totalAssignments = allAssignments.length;
      const completedAssignments = allAssignments.filter((a) => a.status === 'SUBMITTED').length;
      const pendingAssignments = allAssignments.filter((a) => a.status !== 'SUBMITTED').length;
      const inProgressAssignments = 0;
      const completionRate =
        totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

      const submissions = responsesData.submissions || [];

      const questionBreakdown: QuestionStatItem[] = (q.questions || []).map((question) => {
        const answers = submissions
          .flatMap((s) => s.answers || [])
          .filter((ans) => ans.questionId === question.id);

        const totalAnswers = answers.length;

        const item: QuestionStatItem = {
          questionId: question.id,
          questionText: question.text,
          type: question.type,
          totalAnswers,
        };

        if (question.type === 'SINGLE_CHOICE' || question.type === 'YES_NO') {
          const optionCounts: Record<string, { label: string; count: number; percentage: number }> = {};

          (question.options || []).forEach((opt) => {
            optionCounts[opt.id] = {
              label: opt.label,
              count: 0,
              percentage: 0,
            };
          });

          answers.forEach((ans) => {
            if (ans.selectedOptionId && optionCounts[ans.selectedOptionId]) {
              optionCounts[ans.selectedOptionId].count++;
            }
          });

          Object.keys(optionCounts).forEach((optId) => {
            const count = optionCounts[optId].count;
            optionCounts[optId].percentage =
              totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
          });

          item.optionCounts = optionCounts;
        } else if (question.type === 'NUMBER') {
          const numbers = answers
            .map((a) => a.numberValue)
            .filter((n): n is number => n !== null && n !== undefined);
          if (numbers.length > 0) {
            const sum = numbers.reduce((acc, curr) => acc + curr, 0);
            item.average = Number((sum / numbers.length).toFixed(1));
            item.min = Math.min(...numbers);
            item.max = Math.max(...numbers);
          }
        } else if (question.type === 'TEXT') {
          item.sampleTextAnswers = answers
            .map((a) => a.textValue)
            .filter((t): t is string => !!t)
            .slice(0, 5);
        }

        return item;
      });

      return {
        questionnaireId: q.id,
        title: q.title,
        totalAssignments,
        completedAssignments,
        pendingAssignments,
        inProgressAssignments,
        completionRate,
        questionBreakdown,
      };
    } catch (err) {
      console.error('Failed to compute questionnaire stats', err);
      return null;
    }
  },
};
