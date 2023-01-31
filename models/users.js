var mongoose = require('mongoose');
var Schema = mongoose.Schema;

userSchema = new Schema( {
	
	unique_id: Number,
	fullname: String,
	email: String,
	phone: Number,
	address: String,
	password: String,
	passwordConf: String,
	role:{
		type: String,
		default: "user"
	}
}),
module.exports = mongoose.model("users", userSchema);

