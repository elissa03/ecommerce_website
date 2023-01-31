const mongoose = require('mongoose');

const productsSchema = mongoose.Schema({
    name:{
        type: String,
        maxlength: 100,
    },

    author:{
        type: String,
        maxlength: 100,
    },

    path:{
        type: String
    },

    // photo:{
    //     data: Buffer,
    //     contentType: String,
    // },

    price:{
        type: Number,
        maxlength: 10,
    }

})

module.exports = mongoose.model("products", productsSchema)