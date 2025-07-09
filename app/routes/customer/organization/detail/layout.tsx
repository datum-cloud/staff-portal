import type { Route } from "./+types/layout";
import { authenticator } from "@/modules/auth/auth.server";
import { orgDetailQuery } from "@/resources/request/server/organization.request";
import { Organization } from "@/resources/schemas/organization.schema";
import { Outlet } from "react-router";

export const handle = {
  breadcrumb: (data: Organization) => (
    <span>{data.metadata.annotations?.["kubernetes.io/display-name"]}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await orgDetailQuery(
    session?.accessToken ?? "",
    params?.orgName ?? "",
  );

  return data;
};

export default function CustomerOrganizationDetailLayout() {
  return <Outlet />;
}
