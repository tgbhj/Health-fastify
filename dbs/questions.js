const mongoose = require("mongoose");

const questionSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    title: String,
    detail: String,
    answer: {
        doctor: {type: mongoose.Schema.ObjectId, ref: 'doctor'},
        time: Date,
        content: String
    },
    createTime: {type: Date, default: Date.now},
    state: {type: Number, default: 0}//0=可接单，1=已接单，2=已回答
});

const question = mongoose.model("question", questionSchema);

module.exports = question;