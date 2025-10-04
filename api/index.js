import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const { DEV_PORT } = process.env;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));

/************************************************************* 
                        Running Server
*************************************************************/

app.get("/", (req, res) => res.redirect("/docs"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = process.env.PORT || DEV_PORT;

app.listen(port, () => {
  console.log(`For API docs, navigate to http://localhost:${port}`);
})