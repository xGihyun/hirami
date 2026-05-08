import type { BorrowRequestItem } from "@/lib/equipment/model";

export enum ReturnTab {
	BorrowedItems = "borrowed-items",
	ReturnRequestList = "return-request-list",
}

export type SelectedBorrowedEquipment = {
	item: BorrowRequestItem;
	quantity: number;
};
