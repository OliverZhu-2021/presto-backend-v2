import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  store: [{
    type: Schema.Types.ObjectId,
    ref: "Slides",
  }],
  sessionActive: Boolean
});

const User = model("User", userSchema);
export default User;