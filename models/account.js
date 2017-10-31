var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

accountSchema = Schema ({
	id: String,
	date: Date,
	name: String,
	address: String,
	lat: Number,
	lng: Number,
	city: String,
	state: String,
	primaryContactFirstName: String,
	primaryContactLastName: String,
	primaryContactPhoneNumber: String,
	notes: [{
		note: String,
		author: { type: Schema.Types.ObjectId, ref: 'User' },
		time: Date
	}]
	// firstName: String,
	// lastName: String
});

accountSchema.plugin(deepPopulate);

var Account = mongoose.model('Account', accountSchema);

module.exports = { Account }