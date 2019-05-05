const mongoose = require("mongoose");

//医生认证
const hhljurSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    createTime: {type: Date, default: Date.now},//申请时间
    IdCard: String, //身份证
    CardPhoto: String, //手持身份证照片
    certificate: String, //职业证件(书)
});

const hhljur = mongoose.model("hhljur", hhljurSchema);

module.exports = hhljur;