import z from 'zod';

export const GroupMembershipFiltersSchema = z.object({
  fieldSelector: z.string().optional(),
});

export type GroupMembershipFilters = z.infer<typeof GroupMembershipFiltersSchema>;

export const MembershipFiltersSchema = z.object({
  fieldSelector: z.string().optional(),
  labelSelector: z.string().optional(),
  organizationRef: z.string().optional(),
  userRef: z.string().optional(),
});
export type MembershipFilters = z.infer<typeof MembershipFiltersSchema>;

const TeamMemberSchema = z.object({
  givenName: z.string(),
  familyName: z.string(),
  email: z.string(),
  roles: z.array(z.object({ name: z.string(), namespace: z.string().optional() })).optional(),
  invitationState: z.enum(['Pending', 'Accepted', 'Declined']).optional(),
  type: z.enum(['member', 'invitation']),
  name: z.string(),
  createdAt: z.string().optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamMemberListSchema = z.array(TeamMemberSchema);
export type TeamMemberList = z.infer<typeof TeamMemberListSchema>;
