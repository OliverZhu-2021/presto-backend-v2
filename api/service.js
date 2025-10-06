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
        for(const session of activeSessions.values()) {
          // Update user
          const updatedUser = { ...session, store: session.store.map(slides => slides._id)};
          await User.updateOne(
            {_id: session._id},
            {$set: updatedUser}
          )

          // Update slides
          for(const slides of session.store) {
            const updatedSlides = {
              ...slides,
              pages: slides.pages.map(page => ({
                ...page,
                elements: page.elements.map(element => element._id)
              }))
            }
            await Slides.updateOne(
              {_id: slides._id},
              {$set: updatedSlides}
            )

            // Update elements
            for(const page of slides.pages) {
              for(const element of page.elements) {
                const updatedElement = element;
                await Element.updateOne(
                  {_id: element._id},
                  {$set: updatedElement}
                )
              }
            }
          }
        }
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
    
    console.log("Current cached sessions: ", activeSessions);

  } catch (error) {
    console.log("WARNING: No database found, create a new one");
    await save();
  }
})();



