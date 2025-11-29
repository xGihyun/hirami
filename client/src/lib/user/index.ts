export enum UserRole {
	Borrower = "borrower",
	EquipmentManager = "equipment_manager",
}

export type UserRoleDetail = {
	id: number;
	code: UserRole;
	label: string;
};

export type User = {
	id: string;
	createdAt: string;
	updatedAt: string;
	email: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl: string;
	role: UserRoleDetail;
};

export type UserBasicInfo = {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	avatarUrl?: string;
};
