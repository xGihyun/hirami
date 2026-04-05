import z from "zod";

export const userBasicInfoSchema = z.object({
	id: z.uuidv4(),
	firstName: z.string(),
	middleName: z.string().nullable(),
	lastName: z.string(),
	avatarUrl: z.string().nullable(),
});

export type UserBasicInfo = z.infer<typeof userBasicInfoSchema>;
