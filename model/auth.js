import mongoose from "mongoose";
import bcrypt from "bcrypt";

const authSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    email: {
        type: String,
        unique: [true, "User already exists"],
        required: [true, "Email is required"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
});

authSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});

authSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};



export default mongoose.model("user", authSchema);