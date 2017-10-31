var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

RoutesSchema = Schema ({
	id: String,
	routeName: String,
	routeDate: Date,
	routeCreatedBy: String,
	reoccuring: { type: Boolean, default: false },
	reoccuringType: { type: String, default: null },
	reoccuringEndDate: { type: Date, default: null },
	reoccuringDate: { type: Date, default: null }
});

RoutesSchema.plugin(deepPopulate);

var Routes = mongoose.model('Routes', RoutesSchema);

module.exports = { Routes }