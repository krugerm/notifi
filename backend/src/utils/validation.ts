// src/utils/validation.ts
import { z } from 'zod';

export const schemas = {
  message: z.object({
    body: z.string().min(1),
  }),

  user: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
};
