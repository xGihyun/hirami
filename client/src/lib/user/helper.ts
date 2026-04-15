import type { User } from ".";
import type { UserBasicInfo } from "./model";

export function getFullName(user: UserBasicInfo | User, format: "fl" | "lf" = "fl"): string {
	if (format === "fl") {
		return `${user.firstName} ${user.lastName}`;
	}

	return `${user.lastName}, ${user.firstName}`;
}
