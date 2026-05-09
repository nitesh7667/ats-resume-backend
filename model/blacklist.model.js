import mongoose from "mongoose";

const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to be added in blacklist"]
    }
}, {
    timestamps: true
});

export default mongoose.model("BlacklistToken", blacklistTokenSchema);