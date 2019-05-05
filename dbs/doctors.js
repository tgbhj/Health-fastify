const mongoose = require("mongoose");

const doctorSchema = mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: 'hhluser'},
    name: String,
    face: {type: String, default: "/images/face.png"},
    specialty: String,//科室
    title: String,//职称
    education: String,//学历
    profession: String,//专业
    hospital: String,//医院
    experience: String,//经历
    state: {type: Number, default: 0}//在线状态(0离线,1在线)
});

const doctor = mongoose.model("doctor", doctorSchema);

module.exports = doctor;