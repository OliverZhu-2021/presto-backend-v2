import mongoose from "mongoose";

const { Schema, model } = mongoose;
const elementSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  position_X: {
    type: Number,
    required: true,
  },
  poistion_Y: {
    type: Number,
    required: true,
  },
  text: String,
  font_size: String,
  color: String,
  image: String,
  description: String,
  code: String,
  fontSize: String,
  url: String,
  autoPlay: Boolean,
})

const Element = model('Element', elementSchema);
export default Element;