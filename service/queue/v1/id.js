/**
 * 随机数
 * */

function createId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const maxPos = chars.length;
    let nonce_str = '';

    for (let i = 0; i < (length || 32); i++) {
        nonce_str += chars.charAt(Math.floor(Math.random() * maxPos))
    }

    return nonce_str
}

module.exports = createId;