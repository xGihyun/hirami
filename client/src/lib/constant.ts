import {
	IconBox,
	IconHistory,
	IconProfile,
	IconQrCode,
	IconRoundArrowUp,
	IconUserRoundCog,
} from "@/lib/icons";
import { UserRole } from "./user";

export function getNavOptions(role?: UserRole) {
	const profileOption = {
		to: "/profile",
		label: "Profile",
		icon: IconProfile,
	};

	const historyOption = {
		to: "/history",
		label: "History",
		icon: IconHistory,
	};

	if (role === UserRole.Borrower) {
		return [
			{
				to: "/equipments",
				label: "Catalog",
				icon: IconBox,
			},
			{
				to: "/return",
				label: "Return",
				icon: IconRoundArrowUp,
			},
			{
				to: "/personal-history",
				label: "History",
				icon: IconHistory,
			},
			profileOption,
		];
	}

	return [
		{
			to: "/equipments",
			label: "Manage",
			icon: IconBox,
		},
		{
			to: "/borrow-requests",
			label: "Requests",
			icon: IconRoundArrowUp,
		},
		{
			to: "/scan",
			label: "Scan",
			icon: IconQrCode,
		},
		historyOption,
		{
			to: "/users",
			label: "Users",
			icon: IconUserRoundCog,
		},
	];
}
