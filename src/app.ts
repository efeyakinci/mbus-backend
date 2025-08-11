import express from "express";

import { mbusRouter } from "@/routes/mbusRoutes";

const app = express();

app.use(express.json());
app.use("/mbus/api/v3", mbusRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});