import { z } from 'zod';

export const AllowedExpansionTemplates = z.enum([
  'parallel',
  'serpentine',
  'u_shape',
  'split',
  'campus',
  'curved',
  'arc',
  'radial',
  's_shape',
]);

/**
 * Strict schema for AI Capacity Expansion Plan.
 * AI acts as high-level planner producing structured expansion intent without arbitrary meshes or geometry.
 */
export const CapacityExpansionPlanSchema = z.object({
  type: z.literal('capacity_expansion').default('capacity_expansion'),
  targetZone: z.string().min(1),
  reasoning: z.string().min(5).max(1000),
  changes: z.array(
    z.object({
      action: z.enum(['add_queue', 'extend_queue', 'add_holding_bay']),
      template: AllowedExpansionTemplates,
      lanes: z.number().int().min(1).max(16),
      laneWidth: z.number().min(0.8).max(4.0).default(2.0),
      spacing: z.number().min(0.5).max(4.0).default(1.5),
      connection: z.string().optional(),
    })
  ).min(1),
  expectedCapacityIncrease: z.number().nonnegative(),
  constraints: z.array(z.string()).default([]),
});
