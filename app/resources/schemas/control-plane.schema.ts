import { z } from 'zod';

export const ControlPlaneStatus = {
  Success: 'success',
  Error: 'error',
  Pending: 'pending',
} as const;

export type ControlPlaneStatus = (typeof ControlPlaneStatus)[keyof typeof ControlPlaneStatus];

export const DefaultControlPlaneStatusSchema = z
  .object({
    status: z.enum([
      ControlPlaneStatus.Success,
      ControlPlaneStatus.Error,
      ControlPlaneStatus.Pending,
    ]),
    message: z.string(),
  })
  .catchall(z.any());

export type DefaultControlPlaneStatus = z.infer<typeof DefaultControlPlaneStatusSchema>;

export const ExtendedControlPlaneStatusSchema = DefaultControlPlaneStatusSchema.extend({
  isProgrammed: z.boolean().optional(),
  programmedReason: z.string().optional(),
  isAccepted: z.boolean().optional(),
  acceptedReason: z.string().optional(),
  conditions: z
    .array(
      z.object({
        type: z.string(),
        status: z.enum(['True', 'False', 'Unknown']),
        reason: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .optional(),
});

export type ExtendedControlPlaneStatus = z.infer<typeof ExtendedControlPlaneStatusSchema>;
