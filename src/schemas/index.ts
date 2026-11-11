import { z } from 'zod';

/**
 * Contract schemas for the Juice Shop REST API.
 * They validate shape AND basic business rules (non-negative prices, JWT format, roles),
 * and double as TypeScript types for the API client.
 */

export const Product = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string(),
    price: z.number().nonnegative(),
    deluxePrice: z.number().nonnegative(),
    image: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().nullable(),
  })
  .passthrough();
export type Product = z.infer<typeof Product>;

export const ProductSearchResponse = z.object({
  status: z.literal('success'),
  data: z.array(Product),
});

const Jwt = z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'must be a JWT (header.payload.signature)');

export const LoginResponse = z.object({
  authentication: z.object({
    token: Jwt,
    bid: z.number().int().positive(),
    umail: z.string().email(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const RegisteredUser = z
  .object({
    id: z.number().int().positive(),
    email: z.string().email(),
    role: z.enum(['customer', 'deluxe', 'accounting', 'admin']),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough()
  // Sensitive fields must never be returned by the API.
  .refine((u) => !('password' in u), { message: 'response leaks the password hash' })
  .refine((u) => !('totpSecret' in u), { message: 'response leaks the TOTP secret' });
export type RegisteredUser = z.infer<typeof RegisteredUser>;

export const RegisterResponse = z.object({
  status: z.literal('success'),
  data: RegisteredUser,
});

export const BasketItem = z
  .object({
    id: z.number().int().positive(),
    ProductId: z.number().int().positive(),
    BasketId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })
  .passthrough();

export const AddBasketItemResponse = z.object({
  status: z.literal('success'),
  data: BasketItem,
});

export const BasketResponse = z.object({
  status: z.literal('success'),
  data: z
    .object({
      id: z.number().int().positive(),
      UserId: z.number().int().positive().nullable(),
      Products: z.array(Product.and(z.object({ BasketItem }))),
    })
    .passthrough(),
});

export const WhoAmIResponse = z.object({
  user: z
    .object({
      id: z.number().int().positive().optional(),
      email: z.string().email().optional(),
    })
    .passthrough(),
});
