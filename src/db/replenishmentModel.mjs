import mongoose from 'mongoose'

const Schema = mongoose.Schema

const requestSchema = new Schema(
  {
    from: { type: String, default: '', },
    experience: { type: String, default: '', },
    time: { type: String, default: '', },
    goals: { type: String, default: '', },
    state: { type: String, default: '', },
  },
  { versionKey: false, timestamps: true }
)

export const Request = mongoose.model('requests', requestSchema)
