export type AnomalyResult = {
	borrowRequestId: string;
	score: number;
	isAnomaly: boolean;
	isFalsePositive?: boolean;
};
