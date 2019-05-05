const hhlusers = require('../dbs/hhlusers');
const os = require('os');
const hhlvideos = require('../dbs/hhlvideos');
const hhlchannels = require('../dbs/hhlchannels');
const hhlInfo = require('../dbs/hhlInfo');
const doctors = require('../dbs/doctors');
const questions = require('../dbs/questions');

async function getUsers() {
    return await hhlusers.find({type: 0}).exec();
}

async function getDocUsers() {
    return await hhlusers.find({type: 1}).exec();
}

async function getVideos() {
    return await hhlvideos.find().exec();
}

async function getChannels() {
    return await hhlchannels.find().populate('user').exec();
}

async function getHealthInfo() {
    return await hhlInfo.find().exec();
}

async function getDoctors() {
    return await doctors.find().exec();
}

async function questionList1() {
    return await questions.find({state: 0}).exec();
}

async function questionList2() {
    return await questions.find({state: 1}).exec();
}

async function questionList3() {
    return await questions.find({state: 2}).exec();
}

async function admin(req, reply) {
    let sys = {
        arch: os.arch(),
        cpuslength: os.cpus().length,
        cpusmodel: os.cpus()[0].model,
        type: os.type(),
        release: os.release(),
        totalmem: os.totalmem(),
        freemem: os.freemem()
    };
    let users = await getUsers();
    let docUsers = await getDocUsers();
    let videos = await getVideos();
    let channels = await getChannels();
    let infos = await getHealthInfo();
    let doctors = await getDoctors();
    let questionState1 = await questionList1();
    let questionState2 = await questionList2();
    let questionState3 = await questionList3();
    reply.send({
        users: users,
        docUsers: docUsers,
        videos: videos,
        channels: channels,
        healthInfo: infos,
        doctors: doctors,
        questionState1: questionState1,
        questionState2: questionState2,
        questionState3: questionState3,
        sys: sys
    })
}

async function editType(req, reply) {
    await hhlusers
        .findByIdAndUpdate({_id: req.body._id}, {$set: {type: req.body.type}})
        .then(() => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: {}
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        })
}

module.exports = {admin, editType};