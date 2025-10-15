import dotenv from "dotenv"
dotenv.config();

import AsyncLock from "async-lock";
import jwt from "jsonwebtoken";
import { AccessError, InputError } from "./error";
import { populate } from "dotenv";
import User from "../model/user";
import Slides from "../model/slides";
import Element from "../model/element";

const lock = new AsyncLock();

const { JWT_SECRET } = process.env;
/*************************************************************
                        State Management
*************************************************************/

let activeSessions = new Map();

const update = async(activeSessions) =>
  new Promise((resolve, reject) => {
    lock.acquire("saveData", async() => {
      try {
        const userUpdateOps = [];
        const slidesUpdateOps = [];
        const elementUpdateOps = [];

        for (const session of activeSessions.values()) { 
          if(session.store && session.store.length != 0) {
            for(const slides of session.store) {
              if(slides.pages && slides.pages.length != 0) {
                for(const page of slides.pages) {
                  if(page.elements && page.elements.length != 0) {
                    for(const element of page.elements) {
                      // Update element
                      if(element._id) {
                        elementUpdateOps.push({
                          updateOne: {
                            filter: { _id: element._id },
                            update: { $set: element },
                          }
                        });   // Collect direct update
                      } else {
                        const newElement = await Element.create(element);  // Create if not in db
                        element._id = newElement._id;
                      }
                    }
                  }
                }
              }

              // Update slides
              const updatedSlides = {
                ...slides,
                pages: slides.pages.map(page => ({
                  ...page,
                  elements: page.elements.map(element => element._id)
                }))
              }
              if(slides._id) {
                slidesUpdateOps.push({
                  updateOne: {
                    filter: { _id: slides._id},
                    update: {$set: updatedSlides},
                  }
                });   // Collect direct update
              } else {
                const newSlides = await Slides.create(updatedSlides);  // Create if not in db
                slides._id = newSlides._id;
              }
            }
          }
          
          // Update User
          const updatedUser = { ...session, store: session.store.map(slides => slides._id)};
          if(session._id) {
            userUpdateOps.push({
              updateOne: {
                filter: { _id: session._id },
                update: { $set: updatedUser },
              }
            });   // Collect direct update               
          } else {
            const newUser = await User.create(updatedUser);  // Create if not in db
            session._id = newUser._id;
          }
        }

        if(elementUpdateOps.length > 0) await Element.bulkWrite(elementUpdateOps);
        if(slidesUpdateOps.length > 0) await Slides.bulkWrite(slidesUpdateOps);
        if(userUpdateOps.length > 0) await User.bulkWrite(userUpdateOps);

        resolve();
      } catch(error) {
        console.log(error);
        reject(new Error("Writing to database failed"));
      }
    });
  });

export const save = () => update(activeSessions);

(async () => {
  try {
    // Retrieve active users
    const activeUsers = await User.find({ sessionActive: true })
      .populate({
        path: "store",
        populate: {
          path: "pages.elements",
        }
      })
      .lean();

    // Append active users to activeSessions
    if(activeUsers.length != 0) {
      for (const user of activeUsers) {
        activeSessions.set(user.email, user);
      }
    }

    // console.log("Current cached sessions: ", activeSessions);

  } catch (error) {
    console.log("WARNING: No database found, create a new one");
    await save();
  }
})();

/*************************************************************
                        Helper Functions
*************************************************************/

export const userLock = (callback) =>
  new Promise((resolve, reject) => {
    lock.acquire("userAuthLock", callback(resolve, reject));
  });

/***************************************************************
                       Auth Functions
***************************************************************/

export const getEmailFromAuthorization = (authorization) => {
  try {
    const token = authorization.replace("Bearer ", "");
    const { email } = jwt.verify(token, JWT_SECRET);
    if(!activeSessions.has(email)) {
      throw new AccessError("Invalid Token");
    }
    return email;
  } catch {
    throw new AccessError("Invalid Token");
  }
};

export const login = (email, password) =>
  userLock((resolve, reject) => {
    if(activeSessions.has(email)) {
      if(activeSessions.get(email).password === password) {
        activeSessions.get(email).sessionActive = true;
        resolve(jwt.sign({ email }, JWT_SECRET, { algorithm: "HS256" }));
      }
    }
    reject(new InputError("Invalid username or password"));
  })

export const logout = (email) =>
  userLock((resolve, reject) => {
    activeSessions.get(email).sessionActive = false;
    resolve();
  })

export const register = (email, password, name) => 
  userLock((resolve, reject) => {
    try {
      if(activeSessions.has(email)) {
        return reject(new InputError("Email address already registered"));
      }

      activeSessions.set(
        email,
        {
          email,
          name,
          password,
          sessionActive: true,
          store: []
        }
      );

      const token = jwt.sign({ email }, JWT_SECRET, { algorithm: "HS256" });
      resolve(token);
    } catch(error) {
      reject(error);
    }
  });

/***************************************************************
                       Store Functions
***************************************************************/

export const getStore = (email) => 
  userLock((resolve, reject) => {
    const user = activeSessions.get(email);

    if(!user) {
      reject(new Error(`User not found for email: ${email}`));
    }

    const store = user.store;
    resolve(store);
  });

export const setStore = (email, store) => 
  userLock((resolve, reject) => {
    const user = activeSessions.get(email);
    
    if(user) {
      user.store = store;
      activeSessions.set(email, user);
    }

    resolve();
  });