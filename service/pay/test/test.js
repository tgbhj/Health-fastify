let fs = require('fs');
let path = require('path');

function formKey(key) {
    console.log('[原始key]', key);
    let item = key.split('\n').map(val => val.trim());
    console.log('[原始key.split()]', item)
}

console.log(path.resolve('../../..', 'cert/alipay/app_private_key.pem'));
let privateKeyPath = path.resolve('../../..', 'cert/alipay/app_private_key.pem');
formKey(fs.readFileSync(privateKeyPath, 'ascii'));