import mongoose from "mongoose";

const { Schema, model } = mongoose;

const slidesSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  title: String,
  description: String,
  thumbnail: String,
  created_at: String,
  last_update: String,
  pages: [{
    id: {
      type: String,
      required: true,
    },
    elements: [{
      type: Schema.Types.ObjectId,
      ref: "Element",
    }],
    fontFamily: String,
    bgColor: String
  }]
});

const Slides = model("Slides", slidesSchema);
export default Slides;