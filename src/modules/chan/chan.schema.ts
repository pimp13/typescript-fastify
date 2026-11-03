export type CreateBoardBody = {
  slug: string;
  title: string;
  description?: string;
  isNsfw?: boolean;
  isWorksafe?: boolean;
  isActive?: boolean;
  bumpLimit?: number;
  threadLimit?: number;
  maxFileSizeMb?: number;
  forceImage?: boolean;
  sortOrder?: number;
};

export type UpdateBoardBody = Partial<CreateBoardBody>;

export type UpdateThreadBody = Partial<{
  isSticky: boolean;
  isLocked: boolean;
}>;

export type CreateBanBody = {
  ipHash?: string;
  postId?: string;
  reason: string;
  expiresAt?: string | null;
};

export const createBoardBodySchema = {
  type: 'object',
  required: ['slug', 'title'],
  additionalProperties: false,
  properties: {
    slug: {
      type: 'string',
      minLength: 1,
      maxLength: 16,
      pattern: '^[a-z0-9]+$',
    },
    title: { type: 'string', minLength: 2, maxLength: 80 },
    description: { type: 'string', maxLength: 500 },
    isNsfw: { type: 'boolean' },
    isWorksafe: { type: 'boolean' },
    isActive: { type: 'boolean' },
    bumpLimit: { type: 'integer', minimum: 50, maximum: 1000 },
    threadLimit: { type: 'integer', minimum: 20, maximum: 500 },
    maxFileSizeMb: { type: 'integer', minimum: 1, maximum: 20 },
    forceImage: { type: 'boolean' },
    sortOrder: { type: 'integer', minimum: 0, maximum: 10_000 },
  },
} as const;

export const updateBoardBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...createBoardBodySchema.properties,
  },
} as const;

export const updateThreadBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    isSticky: { type: 'boolean' },
    isLocked: { type: 'boolean' },
  },
} as const;

export const createBanBodySchema = {
  type: 'object',
  required: ['reason'],
  additionalProperties: false,
  properties: {
    ipHash: { type: 'string', minLength: 16 },
    postId: { type: 'string', minLength: 1 },
    reason: { type: 'string', minLength: 3, maxLength: 300 },
    expiresAt: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;
