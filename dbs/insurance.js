const mongoose = require("mongoose");

const insuranceSchema = mongoose.Schema({
    company: String,//公司名称
    title: String,//保险项目名称
    content: String,//适用范围
    time: String,//期限
    price: String//价格
});

const insurance = mongoose.model("insurance", insuranceSchema);

module.exports = insurance;