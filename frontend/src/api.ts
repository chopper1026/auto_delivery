export { clearCsrfToken, setCsrfToken } from "./api/client";
export { adminApi } from "./api/admin";
export { publicApi } from "./api/public";

import { adminApi } from "./api/admin";
import { publicApi } from "./api/public";

export const api = {
  ...publicApi,
  ...adminApi,
};
