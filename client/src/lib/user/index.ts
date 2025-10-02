enum UserRole {
	Borrower = "borrower",
	EquipmentManager = "equipment_manager",
}

export type User = {
	id: string;
	createdAt: string;
	updatedAt: string;
	email: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl: string;
	role: UserRole;
};
