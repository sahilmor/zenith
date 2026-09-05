import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';

const tokens = new TokenService();

const createUser = (email: string): Promise<UserDocument> =>
  UserModel.create({
    name: 'Custom User',
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Customization module', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates custom fields, task types, workflows, validates transitions, and accepts public form submissions', async () => {
    const app = createApp();
    const owner = await createUser('custom-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Custom Workspace',
      visibility: 'private',
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });
    const project = await ProjectModel.create({
      workspaceId: workspace.id,
      name: 'Custom Project',
      key: 'CUS',
      ownerId: owner._id,
      createdBy: owner._id,
    });
    const board = await BoardModel.create({
      workspaceId: workspace.id,
      projectId: project._id,
      name: 'Custom Board',
      createdBy: owner._id,
    });
    const todo = await ColumnModel.create({ boardId: board._id, name: 'Todo', order: 0 });
    const done = await ColumnModel.create({ boardId: board._id, name: 'Done', order: 1 });

    const severity = await request(app)
      .post(`/api/workspaces/${workspace.id}/custom-fields`)
      .set('Authorization', bearer(owner))
      .send({
        key: 'severity',
        name: 'Severity',
        fieldType: 'single_select',
        required: true,
        options: [
          { id: 'critical', label: 'Critical', order: 0 },
          { id: 'high', label: 'High', order: 1 },
        ],
      })
      .expect(201);

    const rootCause = await request(app)
      .post(`/api/workspaces/${workspace.id}/custom-fields`)
      .set('Authorization', bearer(owner))
      .send({
        key: 'root_cause',
        name: 'Root Cause',
        fieldType: 'long_text',
        required: false,
      })
      .expect(201);

    const workflow = await request(app)
      .post(`/api/workspaces/${workspace.id}/workflows`)
      .set('Authorization', bearer(owner))
      .send({
        name: 'Bug workflow',
        initialStateId: 'open',
        states: [
          { id: 'open', name: 'Open', category: 'todo', order: 0, columnId: todo.id },
          {
            id: 'done',
            name: 'Done',
            category: 'done',
            terminal: true,
            order: 1,
            columnId: done.id,
          },
        ],
        transitions: [
          {
            id: 'resolve',
            name: 'Resolve',
            fromStateId: 'open',
            toStateId: 'done',
            requiredRoles: ['owner', 'admin', 'manager', 'member'],
            requiredFieldIds: [rootCause.body.data.id],
          },
        ],
      })
      .expect(201);

    const bug = await request(app)
      .post(`/api/workspaces/${workspace.id}/task-types`)
      .set('Authorization', bearer(owner))
      .send({
        name: 'Bug',
        key: 'BUG',
        category: 'bug',
        defaultWorkflowId: workflow.body.data.id,
        fieldIds: [severity.body.data.id, rootCause.body.data.id],
        requiredFieldIds: [severity.body.data.id],
      })
      .expect(201);

    const task = await request(app)
      .post(`/api/columns/${todo.id}/tasks`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Cannot save settings',
        priority: 'high',
        status: 'open',
        taskTypeId: bug.body.data.id,
        customFields: { severity: 'critical' },
        assigneeIds: [],
        labels: [],
      })
      .expect(201);
    expect(task.body.data.workflowStateId).toBe('open');

    await request(app)
      .post(`/api/tasks/${task.body.data.id}/transitions/resolve`)
      .set('Authorization', bearer(owner))
      .send({ customFields: {} })
      .expect(409);

    const transitioned = await request(app)
      .post(`/api/tasks/${task.body.data.id}/transitions/resolve`)
      .set('Authorization', bearer(owner))
      .send({ customFields: { root_cause: 'Validation skipped the settings payload.' } })
      .expect(200);
    expect(transitioned.body.data.workflowStateId).toBe('done');

    const form = await request(app)
      .post(`/api/workspaces/${workspace.id}/forms`)
      .set('Authorization', bearer(owner))
      .send({
        name: 'Bug report',
        visibility: 'public',
        slug: 'bug-report',
        destinationProjectId: project.id,
        destinationBoardId: board.id,
        destinationColumnId: todo.id,
        destinationTaskTypeId: bug.body.data.id,
        active: true,
        fields: [
          { id: 'title', label: 'Title', fieldType: 'title', required: true, order: 0 },
          {
            id: 'severity',
            fieldId: severity.body.data.id,
            label: 'Severity',
            fieldType: 'single_select',
            required: true,
            order: 1,
          },
        ],
      })
      .expect(201);
    expect(form.body.data.slug).toBe('bug-report');

    const publicForm = await request(app).get('/api/public/forms/bug-report').expect(200);
    expect(publicForm.body.data.workspaceId).toBe('');

    const submission = await request(app)
      .post('/api/public/forms/bug-report/submissions')
      .send({ values: { title: 'Public bug', severity: 'high' } })
      .expect(201);
    expect(submission.body.data.submission.createdTaskId).toEqual(expect.any(String));
  });

  it('applies templates to instantiate tasks, projects, boards, workflows, and forms', async () => {
    const app = createApp();
    const owner = await createUser('template-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Template Workspace',
      visibility: 'private',
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });
    const project = await ProjectModel.create({
      workspaceId: workspace.id,
      name: 'Template Project',
      key: 'TPL',
      ownerId: owner._id,
      createdBy: owner._id,
    });
    const board = await BoardModel.create({
      workspaceId: workspace.id,
      projectId: project._id,
      name: 'Template Board',
      createdBy: owner._id,
    });
    const column = await ColumnModel.create({ boardId: board._id, name: 'Todo', order: 0 });

    const createTemplate = (templateType: string, config: Record<string, unknown>) =>
      request(app)
        .post(`/api/workspaces/${workspace.id}/templates`)
        .set('Authorization', bearer(owner))
        .send({ name: `${templateType} template`, templateType, config })
        .expect(201);

    const taskTemplate = await createTemplate('task', {
      title: 'Templated bug report',
      priority: 'high',
    });
    const appliedTask = await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${taskTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({ target: { columnId: column.id } })
      .expect(201);
    expect(appliedTask.body.data.templateType).toBe('task');

    await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${taskTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({})
      .expect(400);

    const projectTemplate = await createTemplate('project', {
      name: 'Templated Project',
      key: 'TMP',
    });
    const appliedProject = await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${projectTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({})
      .expect(201);
    expect(appliedProject.body.data.templateType).toBe('project');

    const boardTemplate = await createTemplate('board', { name: 'Sprint board' });
    const appliedBoard = await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${boardTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({ target: { projectId: project.id } })
      .expect(201);
    expect(appliedBoard.body.data.templateType).toBe('board');

    const workflowTemplate = await createTemplate('workflow', {
      name: 'Reviewed workflow',
      initialStateId: 'open',
      states: [{ id: 'open', name: 'Open', category: 'todo', order: 0 }],
      transitions: [],
    });
    const appliedWorkflow = await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${workflowTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({})
      .expect(201);
    expect(appliedWorkflow.body.data.templateType).toBe('workflow');

    const formTemplate = await createTemplate('form', {
      name: 'Intake form',
      slug: 'template-intake-form',
      destinationProjectId: project.id,
      destinationBoardId: board.id,
      destinationColumnId: column.id,
      fields: [{ id: 'title', label: 'Title', fieldType: 'title', required: true, order: 0 }],
    });
    const appliedForm = await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${formTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({})
      .expect(201);
    expect(appliedForm.body.data.templateType).toBe('form');

    const workspaceTemplate = await createTemplate('workspace', {});
    await request(app)
      .post(`/api/workspaces/${workspace.id}/templates/${workspaceTemplate.body.data.id}/apply`)
      .set('Authorization', bearer(owner))
      .send({})
      .expect(400);
  });
});
