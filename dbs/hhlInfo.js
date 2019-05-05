/**
 * Created by Administrator on 2017-04-10.
 */
const mongoose = require("mongoose");

const hhlInfoSchema = mongoose.Schema({
    title: String,
    image: String,
    detail: String,
    collect: [{type: mongoose.Schema.ObjectId, ref: 'hhluser'}],
    like: [{type: mongoose.Schema.ObjectId, ref: 'hhluser'}],
    view: {type: Number, default: 0},
    createTime: {type: Date, default: Date.now}
});

const hhlInfo = mongoose.model("hhlInfo", hhlInfoSchema);

module.exports = hhlInfo;