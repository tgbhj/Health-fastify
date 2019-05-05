const mongoose = require("mongoose");

const policiesSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: 'hhluser'},
    orderId: String,//投保序列号
    channelOrderNo: String,//订单号
    plan: String,//有无社保
    premium: String,//保费
    amount: String,//保额
    effectivTime: String,//保险起期
    terminalTime: String,//保险止期
    policyNO: String,//保单号
    policyAddress: String,//电子保单下载地址
    recognize: String,//投保人姓名
    recognizeeTelNumber: String,//投保人电话
    state: {type: Number, default: 0}//0(未支付),1(已支付)
});

const policies = mongoose.model("policies", policiesSchema);

module.exports = policies;