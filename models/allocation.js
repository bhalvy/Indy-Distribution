var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);


var allocationSchema = new Schema ({
	id: String,
	account: { type: Schema.Types.ObjectId, ref: 'Account'},
	frequency: { type: Number, default: 0 },
	startDate: { type: Date },
	dayOfWeek: { type: Number },
	active: { type: Boolean, default: true },
	order: [{
		item: { type: Schema.Types.ObjectId, ref: 'Beer'},
		orderSize: Number
	}]
});

var Allocation = mongoose.model('Allocation', allocationSchema)

allocationSchema.plugin(deepPopulate);

module.exports = { Allocation };