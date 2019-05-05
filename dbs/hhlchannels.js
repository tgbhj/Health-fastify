const mongoose = require("mongoose");

const hhlchannelSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    title: String, //标题
    detail: String, //详细信息
    poster: {type: String, default: '/images/poster.jpg'},
    state: {type: Number, default: 0},//直播状态 0(未直播), 1(直播)
    createTime: {type: Date, default: Date.now} //创建时间
});

const hhlchannel = mongoose.model("hhlchannel", hhlchannelSchema);

module.exports = hhlchannel;