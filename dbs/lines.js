const mongoose = require("mongoose");

const lineSchema = mongoose.Schema({
    name: String,
    rtmp: String,
    hls: String,
    online: {type: Number, default: 0},
    sort: Number,
    limit: Number,
    status: {type: String, default: "ready"},
    isCdn: {type: Boolean, default: false}
});

const line = mongoose.model("line", lineSchema);

module.exports = line;