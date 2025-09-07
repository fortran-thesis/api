import { envOptions } from "../configs/environment";

export const devLog = (error: any): void => {
  if (envOptions.isDev) console.error("Error: ", error);
};
