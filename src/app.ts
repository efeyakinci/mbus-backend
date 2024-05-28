import express from "express";
import dotenv from "dotenv";


import mbus from "@/v3"

const app = express();

app.use(express.json());
app.use("/mbus/api/v3", mbus);

const PORT  = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});