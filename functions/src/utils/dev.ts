import { envOptions } from "../configs/environment";

export const devLog = (error: any): void => {
  if (!envOptions.isProd) console.error("Error: ", error);
};
