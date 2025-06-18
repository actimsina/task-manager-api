const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const taskRoutes = require('../routes/taskRoutes');
const Task = require('../models/Task');

const app = express();
app.use(express.json());
app.use('/tasks', taskRoutes);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Task.deleteMany({});
});

describe('Task Routes', () => {
  it('should create a task via POST /tasks', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'Test Task' })
      .expect(201);

    expect(response.body).toHaveProperty('title', 'Test Task');
    expect(response.body).toHaveProperty('_id');

    const task = await Task.findOne({ title: 'Test Task' });
    expect(task).toBeTruthy();
    expect(task.title).toBe('Test Task');
  });

  it('should fail to create a task with missing title via POST /tasks', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: '' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/validation failed/i);

    const tasks = await Task.find();
    expect(tasks.length).toBe(0);
  });

  it('should get all tasks via GET /tasks', async () => {
    await Task.create({ title: 'Task 1' });
    await Task.create({ title: 'Task 2' });

    const response = await request(app)
      .get('/tasks')
      .expect(200);

    expect(response.body.length).toBe(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Task 1' }),
        expect.objectContaining({ title: 'Task 2' }),
      ])
    );
  });

  it('should return empty array when no tasks exist via GET /tasks', async () => {
    const response = await request(app)
      .get('/tasks')
      .expect(200);

    expect(response.body).toEqual([]);
    expect(response.body.length).toBe(0);
  });
});