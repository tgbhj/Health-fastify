const mongoose = require("mongoose");

const hhlvideoSchema = mongoose.Schema({
    name: String,
    size: Number,
    title: String,
    poster: {type: String, default: '/images/poster.jpg'},
    money: {type: Number, default: 0},//0(免费)
    collect: [{type: mongoose.Schema.ObjectId, ref: 'hhluser'}],
    createTime: {type: Date, default: Date.now}
});

const hhlvideo = mongoose.model("hhlvideo", hhlvideoSchema);

module.exports = hhlvideo;