import { z } from 'zod'

export const GenderEnum = z.enum(['man', 'woman', 'male', 'female', 'Male', 'Female'])
export type Gender = z.infer<typeof GenderEnum>

export const SavedPassengerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  age: z.coerce.number().int().min(1).max(120),
  gender: GenderEnum,
  isSelf: z.boolean().optional(),
})

export type SavedPassenger = z.infer<typeof SavedPassengerSchema>

export const AccountCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must not exceed 60 characters'),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'),
  age: z.coerce
    .number()
    .int('Age must be an integer')
    .min(1, 'Age must be at least 1')
    .max(120, 'Age must not exceed 120'),
  gender: GenderEnum,
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  savedPassengers: z.array(SavedPassengerSchema).optional(),
})

export type AccountCreateInput = z.infer<typeof AccountCreateSchema>

export const AccountUpdateSchema = AccountCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

export type AccountUpdateInput = z.infer<typeof AccountUpdateSchema>

export interface UserProfile extends AccountCreateInput {
  uid: string
  createdAt: string
  updatedAt: string
}
