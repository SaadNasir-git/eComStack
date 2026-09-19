import express from 'express';
import 'dotenv/config'

const app = express();

app.get("/", async(req, res) => {
    return res.send("Hey! This is an ecommerce backend.");
})

app.listen(process.env.PORT, () => {
    console.log(`Server is listening on http://localhost:${process.env.PORT}`);
})