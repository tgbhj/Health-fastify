const mongoose = require("mongoose");

const hhluserSchema = mongoose.Schema({
    //_id作为直播串流码
    username: String,//用户名
    password: String, //密码
    email: {type: String, default: ''},//邮箱
    phone: String,//手机号
    type: {type: Number, default: 0},//用户类型0(患者),1(医生)
    face: {type: String, default: '/face/face.png'},
    vip: {type: Number, default: 0},//0(false),1(true)
    regTime: {type: Date, default: Date.now},//注册时间
    admin: {type: Number, default: 0},//0(false),1(true)
    jurisdiction: {type: Number, default: 0},//直播权限0(false),1(true)
    token: {
        content: String,//用户凭证
        startTime: Date,//生成时间
        endTime: Date//过期时间
    },
    virtual: {type: Number, default: 0},//积分
    name: {type: String, default: ''},//姓名
    birthday: {type: String, default: '1950-01-01'},//出生日期
    sex: {type: Number, default: 0},//性别0(女),1(男)
    IdCard: {type: String, default: ''},//身份证
    use: {type: Number, default: 0},//账号状态0(未冻结),1(冻结)
    collect: [{type: mongoose.Schema.ObjectId, ref: 'hhlInfo'}],
    like: [{type: mongoose.Schema.ObjectId, ref: 'hhlInfo'}],
    state: {type: Number, default: 0}//在线状态(0离线,1在线)
});

const hhluser = mongoose.model("hhluser", hhluserSchema);

module.exports = hhluser;