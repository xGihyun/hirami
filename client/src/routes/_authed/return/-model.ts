import type { BorrowedEquipment } from "@/lib/equipment/borrow";

export enum ReturnTab {
	BorrowedItems = "borrowed-items",
	ReturnRequestList = "return-request-list",
}

export type SelectedBorrowedEquipment = {
	equipment: BorrowedEquipment;
	quantity: number;
};
