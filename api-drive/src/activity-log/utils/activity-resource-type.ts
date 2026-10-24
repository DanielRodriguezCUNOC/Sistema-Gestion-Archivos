export const ACTIVITY_RESOURCE_TYPES = ['FILE', 'FOLDER', 'USER'] as const;

export type ActivityResourceType = (typeof ACTIVITY_RESOURCE_TYPES)[number];
