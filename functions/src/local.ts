import express from "express";
import app from "./app";
import {envOptions} from "./configs/environment";

const PORT = envOptions.port || 5001;

const localApp = express();
localApp.use("/thesis-2e701/asia-southeast1/api", app);

localApp.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Local server running on http://localhost:${PORT}/thesis-2e701/asia-southeast1/api`
  );
});
