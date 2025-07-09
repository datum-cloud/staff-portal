import { apiRequestClient } from "@/modules/axios/axios.client";
import { ListQueryParams } from "@/resources/schemas/common.schema";
import { UserResponseSchema } from "@/resources/schemas/user.schema";

export const userQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: "GET",
    url: "/apis/iam.miloapis.com/v1alpha1/users",
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(UserResponseSchema)
    .execute();
};
