// src/__tests__/fixtures/response.fixture.ts

export const SIMPLE_RETURN_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.get('/users', async (req, reply) => {
    return { users: [], total: 0 };
  });
}
`;

export const REPLY_SEND_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.get('/user/:id', async (req, reply) => {
    const user = { id: '1', name: 'Test' };
    reply.send(user);
  });
}
`;

export const REPLY_CODE_SEND_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.post('/users', async (req, reply) => {
    const user = { id: '1', name: 'New User' };
    reply.code(201).send(user);
  });
}
`;

export const ERROR_RESPONSE_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.get('/user/:id', async (req, reply) => {
    const user = null;
    if (!user) {
      reply.code(404).send({ error: 'NOT_FOUND', message: 'User not found' });
      return;
    }
    return user;
  });
}
`;

export const MULTIPLE_ERRORS_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.post('/login', async (req, reply) => {
    const { email, password } = req.body;

    const user = null;
    if (!user) {
      reply.code(404).send({ error: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    const passwordValid = false;
    if (!passwordValid) {
      reply.code(401).send({ error: 'INVALID_PASSWORD', message: 'Invalid password' });
      return;
    }

    reply.code(200).send({ token: 'xxx', user: { id: '1', name: 'Test' } });
  });
}
`;

export const GENERIC_REPLY_FIXTURE = `
import { FastifyInstance } from 'fastify';

type UserResponse = { id: string; name: string };
type ErrorResponse = { error: string; message: string };

export default async function(server: FastifyInstance) {
  server.get<{
    Params: { id: string };
    Reply: UserResponse | ErrorResponse;
  }>('/user/:id', async (req, reply) => {
    // handler implementation
  });
}
`;

export const NO_RESPONSE_FIXTURE = `
import { FastifyInstance } from 'fastify';

export default async function(server: FastifyInstance) {
  server.delete('/user/:id', async (req, reply) => {
    reply.code(204).send();
  });
}
`;
