import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";
import { AccessError, InputError } from "./error";
import mongoose from "mongoose";
import {
  save,
  getEmailFromAuthorization,
  login,
  logout,
  register,
  getStore,
  setStore
} from "./service"

const { DEV_PORT, DB_CONNECTION_STRING } = process.env;

const app = express();

const corsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
                        Auth Functions
*************************************************************/

const authed = (fn) => async(req, res) => {
  const email = getEmailFromAuthorization(req.header("Authorization"));
  await fn(req, res, email);
}

app.post(
  "/admin/auth/login",
  catchErrors(async(req, res) => {
    const { email, password } = req.body;
    const token = await login(email, password);
    return res.json({ token });
  })
);

app.post(
  "/admin/auth/register",
  catchErrors(async(req, res) => {
    const { email, password, name } = req.body;
    const token = await register(email, password, name);
    return res.json({ token });
  })
);

app.post(
  "/admin/auth/logout",
  catchErrors(
    authed(async(req, res, email) => {
      await logout(email);
      return res.json({});
    })
  )
);

/************************************************************* 
                        Store Functions
*************************************************************/

app.get(
  "/store",
  catchErrors(
    authed(async(req, res, email) => {
      const store = await getStore(email);
      return res.json({ store });
    })
  )
);

app.put(
  "/store",
  catchErrors(
    authed(async(req, res, email) => {
      await setStore(email, req.body.store);
      return res.json({});
    })
  )
);

/************************************************************* 
                        Running Server
*************************************************************/

app.get("/", (req, res) => res.redirect("/docs"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = process.env.PORT || DEV_PORT;

app.listen(port, () => {
  console.log(`For API docs, navigate to http://localhost:${port}`);
})