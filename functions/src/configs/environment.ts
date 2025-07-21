export const envOptions = {
  port: process.env.NODE_ENV === "production" ? 3000 : 5001,
  isProd: process.env.NODE_ENV === "production" ? true : false,
  maxSessionAge: 60 * 60 * 24 * 5 * 1000, // 5 days
};
