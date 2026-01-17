import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
});

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Session schemas
export const createSessionSchema = z.object({
  activities: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        durationMinutes: z.number().int().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      })
    )
    .min(1, 'At least one activity is required'),
});

export const updateSessionSchema = z.object({
  currentActivityIndex: z.number().int().min(0).optional(),
  elapsedSeconds: z.number().int().min(0).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']).optional(),
  activityProgress: z
    .array(
      z.object({
        id: z.uuid(),
        elapsedSeconds: z.number().int().min(0),
        completed: z.boolean().optional(),
      })
    )
    .optional(),
});

export const updateActivitiesSchema = z.object({
  activities: z
    .array(
      z.object({
        id: z.uuid().optional(),
        name: z.string().min(1).max(255),
        durationMinutes: z.number().int().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        completed: z.boolean().optional(),
      })
    )
    .min(1),
});

// Label schemas
export const upsertLabelSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
});
