import { z } from "zod";
import type { EnumLike } from "zod/v3";

z.config({
	customError: (issue) => {
		if (issue.code === "too_small") {
			return { message: "This field must not be left blank." };
		}
	},
});

export function enumDetailSchema<T extends EnumLike>(code: T) {
	return z.object({
		id: z.number().nonnegative(),
		label: z.string().nonempty(),
		code: z.enum(code),
	});
}
