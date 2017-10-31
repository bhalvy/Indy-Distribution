var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

orderSchema = Schema ({
	id: String,
	account: { type: Schema.Types.ObjectId, ref: 'Account' },
	date: Date,
	deliveryDate: Date,
	deliveryDateString: String,
	user: {type: Schema.Types.ObjectId, ref: 'User', default: null },
	invoiced: { type: Boolean, default: false },
	canceled: { type: Boolean, default: false },
	delivered: { type: Boolean, default: false },
	note: String,
	route: {type: Schema.Types.ObjectId, ref: 'Routes', default: null },
	allocation: { type: Boolean, default: false },
	allocationId: String,
	allocationWeek: { type: Number, default: 0 },
	order: [{
		item: { type: Schema.Types.ObjectId, ref: 'Beer'},
		orderSize: Number
	}]
});
orderSchema.plugin(deepPopulate);

var Order = mongoose.model('Order', orderSchema);

module.exports = { Order }

