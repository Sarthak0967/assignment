import mongoose, {Schema} from "mongoose";

const postSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    caption: {
        type: String,
        maxLength: 2200,
    },
    media: [
        {
            type: String,
            required: true
        }
    ],
    location: {
        type: String,
    }
},{
    timestamps: true
})

export default mongoose.model('Post', postSchema);