import {
	IconBox,
	IconFileScan,
	IconGitPullRequestArrow,
	IconHistory,
	IconProfile,
	IconQrCode,
	IconRoundArrowUp,
	IconUser,
	IconUserRoundCog,
} from "@/lib/icons";
import { UserRole } from "./user";

export function getNavOptions(role?: UserRole, isMobile: boolean = false) {
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

	const managerLinks = [
		{
			to: "/equipments",
			label: "Manage",
			icon: IconBox,
		},
		{
			to: "/borrow-requests",
			label: "Requests",
			icon: isMobile ? IconRoundArrowUp : IconGitPullRequestArrow,
		},
		{
			to: "/scan",
			label: "Scan",
			icon: isMobile ? IconQrCode : IconFileScan,
		},
		historyOption,
	];

	if (!isMobile) {
		managerLinks.push({
			to: "/users",
			label: "Users",
			icon: isMobile ? IconUserRoundCog : IconUser,
		});
	}

	return managerLinks;
}
