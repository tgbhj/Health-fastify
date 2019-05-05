/**
 * Created by Administrator on 2017-05-11.
 */

const mongoose = require("mongoose");

const findPwdSchema = mongoose.Schema({
    phone: String,
    vcode: String,//6位数字验证码
    isUsed: {type: Boolean, default: false},//验证码是否使用过
    getTime: {type: Date, default: Date.now}//有效时间
});

const findPwd = mongoose.model("findPwd", findPwdSchema);

module.exports = findPwd;