import { z } from 'zod';
import { createPollSchema, voteSchema, polls, options } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  polls: {
    create: {
      method: 'POST' as const,
      path: '/api/polls' as const,
      input: createPollSchema,
      responses: {
        201: z.object({ id: z.string() }), // Return the ID to redirect user
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/polls/:id' as const,
      responses: {
        200: z.custom<typeof polls.$inferSelect & { options: typeof options.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    vote: {
      method: 'POST' as const,
      path: '/api/polls/:id/vote' as const,
      input: voteSchema,
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        409: errorSchemas.conflict, // Already voted
      },
    },
  },
};

// ============================================
// HELPERS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
