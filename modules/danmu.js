const fs = require('fs');
const {appPath} = require('../config/config');

function getDanmu(req, reply) {
    fs.readFile(appPath + '/public/danmu.json', (err, data) => {
        if (err) throw err;
        let str = data.toString();
        reply.send(JSON.parse(str))
    })
}

function saveDanmu(req, reply) {
    let arr = [
        req.body.time,
        req.body.type,
        req.body.color,
        req.body.author,
        req.body.text
    ];
    fs.readFile(appPath + '/public/danmu.json', (err, data) => {
        if (err) throw err;
        let str = data.toString();
        str = JSON.parse(str);
        str.data.push(arr);
        str = JSON.stringify(str);
        fs.writeFile(appPath + '/public/danmu.json', str, (err) => {
            if (err) throw err;
            reply.send('Success');
        })
    })
}

module.exports = {getDanmu, saveDanmu};