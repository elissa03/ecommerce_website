var mongoose = require('mongoose');
var Schema = mongoose.Schema;

purchaseSchema = new Schema({

    userId:{
        type: Number
    },

    orderId:{
        type: Number
    },

    date: Date
}),
module.exports = mongoose.model("purchases", purchaseSchema);