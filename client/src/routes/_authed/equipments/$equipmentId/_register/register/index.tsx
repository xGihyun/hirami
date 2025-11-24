import { createFileRoute, redirect } from "@tanstack/react-router";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute(
	"/_authed/equipments/$equipmentId/_register/register/",
)({
	beforeLoad: () => {
		throw redirect({
			to: "/equipments/$equipmentId/register/name",
			params: { equipmentId: uuidv4() },
		});
	},
});
