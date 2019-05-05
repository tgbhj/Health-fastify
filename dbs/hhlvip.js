const mongoose = require("mongoose");

const hhlvipSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    startTime: {type: Date, default: Date.now},//起始时间
    endTime: {type: Date, default: Date.now},//过期时间
    lv: {type: Number, default: 1}//等级
});

const hhlvip = mongoose.model("hhlvip", hhlvipSchema);

module.exports = hhlvip;