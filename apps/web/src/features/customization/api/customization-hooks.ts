'use client';

import type {
  CustomFieldDefinitionSummary,
  IntakeFormSummary,
  TaskTypeSummary,
  TemplateSummary,
  WorkflowSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export interface CreateFieldInput {
  key: string;
  name: string;
  fieldType: CustomFieldDefinitionSummary['fieldType'];
  required?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  groupable?: boolean;
  analyticsEnabled?: boolean;
  options?: CustomFieldDefinitionSummary['options'];
}

export interface CreateTaskTypeInput {
  name: string;
  key: string;
  category?: TaskTypeSummary['category'];
  color?: string;
  fieldIds?: string[];
  requiredFieldIds?: string[];
  defaultWorkflowId?: string | null;
  defaultPriority?: TaskTypeSummary['defaultPriority'];
}

export interface CreateWorkflowInput {
  name: string;
  states: WorkflowSummary['states'];
  transitions: WorkflowSummary['transitions'];
  initialStateId: string;
}

export interface CreateFormInput {
  name: string;
  visibility: IntakeFormSummary['visibility'];
  slug: string;
  destinationProjectId: string;
  destinationBoardId: string;
  destinationColumnId: string;
  destinationTaskTypeId?: string | null;
  active?: boolean;
  fields: IntakeFormSummary['fields'];
  confirmationMessage?: string;
}

export interface CreateTemplateInput {
  name: string;
  templateType: TemplateSummary['templateType'];
  config?: Record<string, unknown>;
}

export const customizationKeys = {
  fields: (workspaceId: string | null | undefined) =>
    ['customization', workspaceId, 'fields'] as const,
  taskTypes: (workspaceId: string | null | undefined) =>
    ['customization', workspaceId, 'task-types'] as const,
  workflows: (workspaceId: string | null | undefined) =>
    ['customization', workspaceId, 'workflows'] as const,
  forms: (workspaceId: string | null | undefined) =>
    ['customization', workspaceId, 'forms'] as const,
  publicForm: (slug: string | null | undefined) => ['customization', 'public-form', slug] as const,
  templates: (workspaceId: string | null | undefined) =>
    ['customization', workspaceId, 'templates'] as const,
};

export function useCustomFields(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.fields(workspaceId),
    queryFn: () =>
      apiRequest<CustomFieldDefinitionSummary[]>(`/api/workspaces/${workspaceId}/custom-fields`),
    enabled: Boolean(workspaceId),
  });
}

export function useTaskTypes(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.taskTypes(workspaceId),
    queryFn: () => apiRequest<TaskTypeSummary[]>(`/api/workspaces/${workspaceId}/task-types`),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkflows(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.workflows(workspaceId),
    queryFn: () => apiRequest<WorkflowSummary[]>(`/api/workspaces/${workspaceId}/workflows`),
    enabled: Boolean(workspaceId),
  });
}

export function useForms(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.forms(workspaceId),
    queryFn: () => apiRequest<IntakeFormSummary[]>(`/api/workspaces/${workspaceId}/forms`),
    enabled: Boolean(workspaceId),
  });
}

export function useTemplates(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.templates(workspaceId),
    queryFn: () => apiRequest<TemplateSummary[]>(`/api/workspaces/${workspaceId}/templates`),
    enabled: Boolean(workspaceId),
  });
}

export function usePublicForm(slug: string | null | undefined) {
  return useQuery({
    queryKey: customizationKeys.publicForm(slug),
    queryFn: () => apiRequest<IntakeFormSummary>(`/api/public/forms/${slug}`),
    enabled: Boolean(slug),
  });
}

export function useCreateCustomField(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['custom-field-create'],
    meta: {
      loadingTitle: 'Creating field',
      successTitle: 'Field created',
      errorTitle: 'Field creation failed',
    },
    mutationFn: (input: CreateFieldInput) =>
      apiRequest<CustomFieldDefinitionSummary>(`/api/workspaces/${workspaceId}/custom-fields`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customizationKeys.fields(workspaceId) }),
  });
}

export function useCreateTaskType(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['task-type-create'],
    meta: {
      loadingTitle: 'Creating task type',
      successTitle: 'Task type created',
      errorTitle: 'Task type creation failed',
    },
    mutationFn: (input: CreateTaskTypeInput) =>
      apiRequest<TaskTypeSummary>(`/api/workspaces/${workspaceId}/task-types`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customizationKeys.taskTypes(workspaceId) }),
  });
}

export function useCreateWorkflow(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workflow-create'],
    meta: {
      loadingTitle: 'Creating workflow',
      successTitle: 'Workflow created',
      errorTitle: 'Workflow creation failed',
    },
    mutationFn: (input: CreateWorkflowInput) =>
      apiRequest<WorkflowSummary>(`/api/workspaces/${workspaceId}/workflows`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customizationKeys.workflows(workspaceId) }),
  });
}

export function useCreateTemplate(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['template-create'],
    meta: {
      loadingTitle: 'Creating template',
      successTitle: 'Template created',
      errorTitle: 'Template creation failed',
    },
    mutationFn: (input: CreateTemplateInput) =>
      apiRequest<TemplateSummary>(`/api/workspaces/${workspaceId}/templates`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customizationKeys.templates(workspaceId) }),
  });
}

export function useSubmitPublicForm(slug: string | null | undefined) {
  return useMutation({
    mutationKey: ['public-form-submit', slug],
    meta: {
      loadingTitle: 'Submitting form',
      successTitle: 'Form submitted',
      errorTitle: 'Form submission failed',
    },
    mutationFn: (values: Record<string, unknown>) =>
      apiRequest<{ confirmationMessage: string }>(`/api/public/forms/${slug}/submissions`, {
        method: 'POST',
        body: { values },
      }),
  });
}
