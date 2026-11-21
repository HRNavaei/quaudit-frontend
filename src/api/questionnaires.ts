import { apiClient } from './client';
import { Questionnaire, Question, QuestionOption, QuestionnaireStatus, QuestionType } from '../types';

export interface CreateQuestionnaireDto {
  title: string;
  description?: string;
  status?: QuestionnaireStatus;
}

export interface UpdateQuestionnaireDto {
  title?: string;
  description?: string;
  status?: QuestionnaireStatus;
}

export interface CreateQuestionDto {
  text: string;
  type: QuestionType;
  isRequired?: boolean;
  order?: number;
}

export interface UpdateQuestionDto {
  text?: string;
  type?: QuestionType;
  isRequired?: boolean;
  order?: number;
}

export interface CreateOptionDto {
  label: string;
  value: string;
  order?: number;
  followUpQuestionId?: string | null;
}

export interface UpdateOptionDto {
  label?: string;
  value?: string;
  order?: number;
  followUpQuestionId?: string | null;
}

export const questionnairesApi = {
  getAll: async (status?: QuestionnaireStatus): Promise<Questionnaire[]> => {
    const response = await apiClient.get<Questionnaire[]>('/questionnaires', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Questionnaire> => {
    const response = await apiClient.get<Questionnaire>(`/questionnaires/${id}`);
    return response.data;
  },

  create: async (data: CreateQuestionnaireDto): Promise<Questionnaire> => {
    const response = await apiClient.post<Questionnaire>('/questionnaires', data);
    return response.data;
  },

  update: async (id: string, updates: UpdateQuestionnaireDto): Promise<Questionnaire> => {
    const response = await apiClient.patch<Questionnaire>(`/questionnaires/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/questionnaires/${id}`);
  },

  clone: async (id: string): Promise<Questionnaire> => {
    const response = await apiClient.post<Questionnaire>(`/questionnaires/${id}/clone`);
    return response.data;
  },

  // Questions CRUD
  createQuestion: async (questionnaireId: string, data: CreateQuestionDto): Promise<Question> => {
    const response = await apiClient.post<Question>(`/questionnaires/${questionnaireId}/questions`, data);
    return response.data;
  },

  updateQuestion: async (
    questionnaireId: string,
    questionId: string,
    data: UpdateQuestionDto
  ): Promise<Question> => {
    const response = await apiClient.patch<Question>(
      `/questionnaires/${questionnaireId}/questions/${questionId}`,
      data
    );
    return response.data;
  },

  deleteQuestion: async (questionnaireId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/questionnaires/${questionnaireId}/questions/${questionId}`);
  },

  // Options CRUD
  createOption: async (
    questionnaireId: string,
    questionId: string,
    data: CreateOptionDto
  ): Promise<QuestionOption> => {
    const response = await apiClient.post<QuestionOption>(
      `/questionnaires/${questionnaireId}/questions/${questionId}/options`,
      data
    );
    return response.data;
  },

  updateOption: async (
    questionnaireId: string,
    questionId: string,
    optionId: string,
    data: UpdateOptionDto
  ): Promise<QuestionOption> => {
    const response = await apiClient.patch<QuestionOption>(
      `/questionnaires/${questionnaireId}/questions/${questionId}/options/${optionId}`,
      data
    );
    return response.data;
  },

  deleteOption: async (
    questionnaireId: string,
    questionId: string,
    optionId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/questionnaires/${questionnaireId}/questions/${questionId}/options/${optionId}`
    );
  },
};
