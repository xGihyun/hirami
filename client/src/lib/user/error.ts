export class ErrInvalidCredentials extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidCredentials";
	}
}
