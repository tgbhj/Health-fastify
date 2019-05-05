const mongoose = require("mongoose");

const medicineSchema = mongoose.Schema({
    medicine: String,
    component: String,
    disease: String,
    company: String,
    approval: Date
});

const medicine = mongoose.model("medicine", medicineSchema);

module.exports = medicine;