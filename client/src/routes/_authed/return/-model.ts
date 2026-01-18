import type { Equipment } from "@/lib/equipment";
import type { BorrowRequestItem } from "@/lib/equipment/borrow";

export enum ReturnTab {
	BorrowedItems = "borrowed-items",
	ReturnRequestList = "return-request-list",
}

export type SelectedBorrowedEquipment = {
	item: BorrowRequestItem;
	quantity: number;
};
