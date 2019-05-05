const hhlvideos = require('../dbs/hhlvideos');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {appPath} = require('../config/config');
const {randomWord} = require('../modules/random');
const pump = require('pump');

async function getVideos(req, reply) {
    await hhlvideos
        .find()
        .sort({createTime: -1})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: cb
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

async function getVideo(req, reply) {
    await hhlvideos
        .findById({_id: req.headers.id})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: cb
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

async function saveVideo(req, reply, video) {
    await new hhlvideos({
        name: video.videoName,
        filename: video.videoFileName,
        size: video.size,
        title: req.body.title,
        poster: video.videoPoster
    }).save((err, cb) => {
        if (err == null) {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: cb
            })
        } else {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        }
    })
}

async function videoDel(req, reply) {
    await hhlvideos
        .deleteOne({_id: req.headers.id})
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

async function uploadVideo(req, reply) {
    await req.multipart(handler, err => {
        if (err) {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        } else {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: {}
            });
        }
    });

    function handler(field, file, filename, encoding, mimetype) {
        filename = randomWord(true, 32, 32) + '.mp4';
        let _path = './public/videos/' + filename;
        pump(file, fs.createWriteStream('./public/videos/' + filename));
        ffmpeg(_path)
            .screenshots({
                timestamps: ['00:00:15'],
                filename: filename,
                folder: appPath + '/public/images/',
                size: '720x480'
            })
            .on('end', () => {
                console.log('End');
            })
            .on('error', err => {
                console.log('截图错误：' + err);
            });
    }
}

module.exports = {getVideos, getVideo, saveVideo, videoDel, uploadVideo};