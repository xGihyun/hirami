export type ApiResponse<T = unknown> = {
	data: T;
	code: number;
	message: string;
};
