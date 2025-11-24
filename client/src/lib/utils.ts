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

export function getBorrowRequestBadgeVariant(status: BorrowRequestStatus): BadgeVariant {
	switch (status) {
		case BorrowRequestStatus.Approved:
			return "warning";
		case BorrowRequestStatus.Fulfilled:
			return "success";
		case BorrowRequestStatus.Rejected:
			return "destructive";
		case BorrowRequestStatus.Received:
			return "secondary";
	}

	return "default";
}
