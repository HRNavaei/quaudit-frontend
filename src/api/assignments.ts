import { apiClient } from './client';
import {
  QuestionnaireAssignment,
  AssignmentStatus,
  AnswerItemDto,
  QuestionnaireResponsesResult,
  AiAssessmentResponse,
} from '../types';

export interface CreateAssignmentDto {
  questionnaireId: string;
  supplierId: string;
  productId?: string | null;
}

export const assignmentsApi = {
  getAll: async (filters?: {
    supplierId?: string;
    questionnaireId?: string;
    status?: AssignmentStatus;
  }): Promise<QuestionnaireAssignment[]> => {
    const response = await apiClient.get<QuestionnaireAssignment[]>('/assignments', {
      params: filters,
    });
    return response.data;
  },

  getById: async (id: string): Promise<QuestionnaireAssignment> => {
    const response = await apiClient.get<QuestionnaireAssignment>(`/assignments/${id}`);
    return response.data;
  },

  create: async (data: CreateAssignmentDto): Promise<QuestionnaireAssignment> => {
    const response = await apiClient.post<QuestionnaireAssignment>('/assignments', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assignments/${id}`);
  },

  updateStatus: async (
    id: string,
    status: AssignmentStatus
  ): Promise<QuestionnaireAssignment> => {
    const response = await apiClient.patch<QuestionnaireAssignment>(
      `/assignments/${id}/status`,
      { status }
    );
    return response.data;
  },

  saveAnswers: async (
    assignmentId: string,
    answers: AnswerItemDto[]
  ): Promise<QuestionnaireAssignment> => {
    const response = await apiClient.post<QuestionnaireAssignment>(
      `/assignments/${assignmentId}/answers`,
      { answers }
    );
    return response.data;
  },

  submit: async (assignmentId: string): Promise<QuestionnaireAssignment> => {
    const response = await apiClient.post<QuestionnaireAssignment>(
      `/assignments/${assignmentId}/submit`
    );
    return response.data;
  },

  getResponses: async (questionnaireId: string): Promise<QuestionnaireResponsesResult> => {
    const response = await apiClient.get<QuestionnaireResponsesResult>(
      `/assignments/questionnaire/${questionnaireId}/responses`
    );
    return response.data;
  },

  generateAiAssessment: async (assignmentId: string): Promise<AiAssessmentResponse> => {
    const response = await apiClient.post<AiAssessmentResponse>(
      `/assignments/${assignmentId}/ai-assessment`
    );
    return response.data;
  },
};
