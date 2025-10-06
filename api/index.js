import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";
import { AccessError, InputError } from "./error";
import { save } from "./service";
import mongoose from "mongoose";

const { DEV_PORT, DB_CONNECTION_STRING } = process.env;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));

mongoose.connect(DB_CONNECTION_STRING);

const catchErrors = (fn) => async(req, res) => {
  try {
    await fn(req, res);
    save();
  } catch(err) {
    if(err instanceof InputError) {   
      res.status(400).send({ error: err.message });
    } else if(err instanceof AccessError) {   
      res.status(403).send({ error: err.message });
    } else {
      console.log(err);
      res.status(500).send({ error: "A system error ocurred" });
    }
  }
};

/************************************************************* 
                        Running Server
*************************************************************/

app.get("/", (req, res) => res.redirect("/docs"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = process.env.PORT || DEV_PORT;

app.listen(port, () => {
  console.log(`For API docs, navigate to http://localhost:${port}`);
})