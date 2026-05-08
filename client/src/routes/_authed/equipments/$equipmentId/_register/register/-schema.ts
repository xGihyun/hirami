import { IMAGE_FORMATS, IMAGE_SIZE_LIMIT } from "@/lib/api";
import z from "zod";

export const registerEquipmentNameSchema = z.object({
	name: z.string().nonempty(),
	brand: z.string().optional(),
	model: z.string().optional(),
	categoryIds: z.array(z.string()).nonempty({ message: "At least one category is required." }),
});

export type RegisterEquipmentNameSchema = z.infer<
	typeof registerEquipmentNameSchema
>;

export const registerEquipmentQuantitySchema = z.object({
	acquisitionDate: z.date(),
	quantity: z
		.number({ error: "This field must not be left blank." })
		.positive({ error: "Quantity must be greater than zero." }),
});

export type RegisterEquipmentQuantitySchema = z.infer<
	typeof registerEquipmentQuantitySchema
>;

export const registerEquipmentImageSchema = z.object({
	image: z
		.instanceof(File)
		.refine(
			(file) => file.size <= IMAGE_SIZE_LIMIT,
			"Invalid file: Must be PNG or JPG, under 5MB",
		)
		.refine(
			(file) => IMAGE_FORMATS.includes(file.type),
			"Invalid file: Must be PNG or JPG, under 5MB",
		)
		.optional(),
});

export type RegisterEquipmentImageSchema = z.infer<
	typeof registerEquipmentImageSchema
>;

export const registerEquipmentSchema = registerEquipmentNameSchema
	.extend(registerEquipmentQuantitySchema.shape)
	.extend(registerEquipmentImageSchema.shape);

export type RegisterEquipmentSchema = z.infer<typeof registerEquipmentSchema>;
