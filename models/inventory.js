var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var inventorySchema = new Schema ({
		date: Date,
		beer: { type: Schema.Types.ObjectId, ref: 'Beer' },
		size: { type: String, default: "Not Defined" },
		orderId: { type: Schema.Types.ObjectId, default: null, ref: 'Order' },
		user: { type: Schema.Types.ObjectId, ref: 'User' },
		fulfilled: { type: Boolean, default: false },
		canceled: { type: Boolean, default: false},
		unitNumber: { type: Number, default: 0 },
		note: String,
		initialInventory: { type: Boolean, default: false },
		manualAdjustment: { type: Boolean, default: false }
});

var Inventory = mongoose.model('Inventory', inventorySchema)

inventorySchema.plugin(deepPopulate);

module.exports = { Inventory };