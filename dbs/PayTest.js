const mongoose = require("mongoose");

const PayTestSchema = mongoose.Schema({
    out_trade_no: String, // 商户订单号
    tradeStatus: String, // 支付状态, 最终支付状态(支付成功/支付失败)
    type: String // 支付类型
});

const PayTest = mongoose.model("PayTest", PayTestSchema);

module.exports = PayTest;