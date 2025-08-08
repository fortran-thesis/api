import express from "express";
import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5001;

const localApp = express();
localApp.use("/thesis-2e701/asia-southeast1/api", app);

localApp.listen(PORT, () => {
  console.log(
    `Local server running on http://localhost:${PORT}/thesis-2e701/asia-southeast1/api`
  );
});
