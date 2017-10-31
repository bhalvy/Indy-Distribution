var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);


var beerSchema = new Schema ({
	id: String,
	name: String,
	size: String,
	// limited: Boolean,
	active: { type: Boolean, default: true },
	inventory: [{
		date: Date,
		fulfilled: { type: Boolean, default: true },
		orderSize: { type: Number, default: 0 },
		currentInventory: { type: Number, default: 0 },
		orderId: String,
		user: { type: Schema.Types.ObjectId, ref: 'User' },
		note: String,
	}]
});

var Beer = mongoose.model('Beer', beerSchema)

beerSchema.plugin(deepPopulate);

module.exports = { Beer };