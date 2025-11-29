import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BorrowRequestStatus } from "./equipment/borrow";
import type { BadgeVariant } from "@/components/ui/badge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function capitalizeWords(str: string): string {
	return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getBorrowRequestBadgeVariant(
	status: BorrowRequestStatus,
): BadgeVariant {
	switch (status) {
		case BorrowRequestStatus.Approved:
			return "warning";
		case BorrowRequestStatus.Returned:
			return "success";
		case BorrowRequestStatus.Rejected:
			return "destructive";
		case BorrowRequestStatus.Claimed:
			return "secondary";
	}

	return "default";
}

export function getRemainingMs(end: Date): number {
	const now = new Date();
	return end.getTime() - now.getTime();
}
