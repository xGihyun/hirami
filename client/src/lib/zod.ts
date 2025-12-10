import { z } from "zod";

z.config({
	customError: (issue) => {
		if (issue.code === "too_small") {
			return { message: "This field must not be left blank." };
		}
	},
});
