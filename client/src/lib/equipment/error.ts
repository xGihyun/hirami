export class ErrExistingEquipment extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ExistingEquipment";
	}
}
