import z from "zod";
import { IMAGE_FORMATS, IMAGE_SIZE_LIMIT } from "../api";
import { UserRole } from ".";

export const userBasicInfoSchema = z.object({
	id: z.uuidv4(),
	firstName: z.string(),
	middleName: z.string().nullable(),
	lastName: z.string(),
	avatarUrl: z.string().nullable(),
});

export type UserBasicInfo = z.infer<typeof userBasicInfoSchema>;

export const emailSchema = z.object({
	email: z.string().nonempty().email({ error: "Invalid email format." }),
});

const hasUppercase = (str: string) => /[A-Z]/.test(str);
const hasLowercase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /[0-9]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*()]/.test(str);

export const validationRules = [
	{ label: "Minimum of 8 characters", check: (str: string) => str.length >= 8 },
	{ label: "At least 1 uppercase letter (A-Z)", check: hasUppercase },
	{ label: "At least 1 lowercase letter (a-z)", check: hasLowercase },
	{ label: "At least 1 number (0-9)", check: hasNumber },
	{ label: "At least 1 special character (!@#$%^&*)", check: hasSpecialChar },
];

export const passwordSchema = z.object({
	password: z
		.string()
		.nonempty()
		.min(8, "Password requirements not met.")
		.refine(hasUppercase, "Password requirements not met.")
		.refine(hasLowercase, "Password requirements not met.")
		.refine(hasNumber, "Password requirements not met.")
		.refine(hasSpecialChar, "Password requirements not met."),
	confirmPassword: z.string().nonempty(),
});

export const personalInfoSchema = z.object({
	firstName: z.string().nonempty(),
	middleName: z.string().optional(),
	lastName: z.string().nonempty(),
	avatar: z
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

export const roleSchema = z.object({
	role: z.enum(UserRole),
});

export const registerUserSchema = emailSchema
	.extend(passwordSchema.shape)
	.extend(personalInfoSchema.shape)
	.extend(roleSchema.shape);
export type RegisterUser = z.infer<typeof registerUserSchema>;
