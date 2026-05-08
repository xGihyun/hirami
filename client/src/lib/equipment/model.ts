import z from "zod";
import { userBasicInfoSchema } from "../user/model";
import { enumDetailSchema } from "../zod";

//
// Equipment
//

export enum EquipmentStatus {
	Available = "available",
	Reserved = "reserved",
	Borrowed = "borrowed",
	Damaged = "damaged",
	Lost = "lost",
	Maintenance = "maintenance",
	Disposed = "disposed",
}

export const categorySchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	color: z.string().nullable(),
});
export type Category = z.infer<typeof categorySchema>;

export const equipmentSchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	brand: z.string().nullable(),
	model: z.string().nullable(),
	imageUrl: z.string().nullable(),
	quantity: z.number().nonnegative(),
	categories: categorySchema.array().nullable().default([]),
	status: enumDetailSchema(EquipmentStatus),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const equipmentStatusQuantitySchema = z.object({
	quantity: z.number().nonnegative(),
	status: enumDetailSchema(EquipmentStatus),
});
export type EquipmentStatusQuantity = z.infer<
	typeof equipmentStatusQuantitySchema
>;

export const equipmentInventoryStatusSchema = z.object({
	id: z.uuidv4(),
	name: z.string(),
	brand: z.string().nullable(),
	model: z.string().nullable(),
	imageUrl: z.string().nullable(),
	categories: categorySchema.array().nullable().default([]),
	statusQuantity: equipmentStatusQuantitySchema.array(),
});
export type EquipmentInventoryStatus = z.infer<
	typeof equipmentInventoryStatusSchema
>;

//
// Borrow Request
//
export enum BorrowRequestStatus {
	Pending = "pending",
	Approved = "approved",
	Claimed = "claimed",
	Returned = "returned",
	Unclaimed = "unclaimed",
	Rejected = "rejected",
}

const borrowReviewSchema = z.object({
	reviewedBy: userBasicInfoSchema,
	reviewedAt: z.coerce.date(),
	remarks: z.string().nullable(),
});

export const activeBorrowRequestSchema = z.object({
	id: z.uuidv4(),
	requestedAt: z.coerce.date(),
	borrower: userBasicInfoSchema,
	location: z.string(),
	purpose: z.string(),
	expectedReturnAt: z.coerce.date(),
	status: enumDetailSchema(BorrowRequestStatus),
	review: borrowReviewSchema,
	quantity: z.number().nonnegative(),
});
export type ActiveBorrowRequest = z.infer<typeof activeBorrowRequestSchema>;

export const equipmentWithBorrowerSchema = z.object({
	equipment: equipmentSchema,
	requests: activeBorrowRequestSchema.array(),
});
export type EquipmentWithBorrower = z.infer<typeof equipmentWithBorrowerSchema>;

export const borrowRequestItemSchema = z.object({
	id: z.uuidv4(),
	equipment: equipmentSchema.omit({
		status: true,
	}),
});
export type BorrowRequestItem = z.infer<typeof borrowRequestItemSchema>;

const returnedEquipmentSchema = z.object({
	id: z.uuid(),
	quantity: z.number().nonnegative(),
});

const returnConfirmationSchema = z.object({
	id: z.uuid(),
	confirmedBy: userBasicInfoSchema.nullable(),
	confirmedAt: z.coerce.date(),
	equipments: returnedEquipmentSchema.array(),
	remarks: z.string().nullable(),
});

const otpSchema = z.object({
	code: z.string().nonempty(),
	createdAt: z.coerce.date(),
	expiresAt: z.coerce.date(),
});

const anomalyResultSchema = z.object({
	borrowRequestId: z.uuid(),
	score: z.number(),
	isAnomaly: z.boolean(),
	isFalsePositive: z.boolean().nullable(),
});

export const borrowRequestSchema = z.object({
	id: z.uuidv4(),
	requestedAt: z.coerce.date(),
	borrower: userBasicInfoSchema,
	requestedItems: borrowRequestItemSchema.array(),
	location: z.string(),
	purpose: z.string(),
	status: enumDetailSchema(BorrowRequestStatus),
	review: borrowReviewSchema.nullable(),
	expectedReturnAt: z.coerce.date(),
	actualReturnAt: z.coerce.date().nullable(),
	returnConfirmations: returnConfirmationSchema.array(),
	otp: otpSchema.nullable(),
	anomaly: anomalyResultSchema.nullable(),
});
export type BorrowRequest = z.infer<typeof borrowRequestSchema>;

export type ReviewBorrowRequest = {
	id: string;
	reviewedBy: string;
	remarks?: string;
	status: BorrowRequestStatus;
};

export const reviewBorrowResponseSchema = z.object({
	id: z.uuid(),
	reviewedBy: userBasicInfoSchema,
	remarks: z.string().nullable(),
	status: enumDetailSchema(BorrowRequestStatus),
});
export type ReviewBorrowResponse = z.infer<typeof reviewBorrowResponseSchema>;

export type UpdateBorrowRequest = {
	id: string;
	status: BorrowRequestStatus;
};

export const updateBorrowResponseSchema = z.object({
	id: z.uuid(),
	status: enumDetailSchema(BorrowRequestStatus),
});
export type UpdateBorrowResponse = z.infer<typeof updateBorrowResponseSchema>;

//
// Return Request
//

export const returnRequestSchema = z.object({
	id: z.uuid(),
	createdAt: z.coerce.date(),
	borrower: userBasicInfoSchema,
	equipments: equipmentSchema.omit({ status: true }).array(),
	expectedReturnAt: z.coerce.date(),
	otp: otpSchema.optional(),
});
export type ReturnRequest = z.infer<typeof returnRequestSchema>;
