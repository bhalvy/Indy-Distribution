///
/// Modules
///

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var flash = require('connect-flash');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var dateFormat = require('dateformat');
var moment = require('moment');
var sortBy = require('sort-by');
var async = require('async');
var moment = require('moment');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyC9geBohhZ3DehycMZEBqiZmo6qfDu9dEs'
});


///
/// Models
///

var User = require('../models/user');
var Beer = require('../models/beer');
var Beer = Beer.Beer;
var Routes = require('../models/routes');
var Routes = Routes.Routes;
var Allocation = require('../models/allocation');
var Allocation = Allocation.Allocation;
var Inventory = require('../models/inventory');
var Inventory = Inventory.Inventory;
var Account = require('../models/account');
var Account = Account.Account
var Order = require('../models/order');


///
/// Authentication / Users
///

var isAuthenticated = function (req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/');
};


///
/// Create
///

var createNewAccount = function(req) {
	googleMapsClient.geocode({
		address: req.body.address
	}, function(err, response) {
			if (!err) {
				// console.log(response)
				acctToSave = new Account({ 
					'name': req.body.name,
					'date': new Date,
					'address': req.body.address,
					'city': req.body.city,
					'state': req.body.state,
					'primaryContactFirstName': req.body.primaryContactFirstName,
					'primaryContactLastName': req.body.primaryContactLastName,
					'primaryContactPhoneNumber': req.body.primaryContactPhoneNumber,
					'lat': response.json.results[0].geometry.location.lat,
					'lng': response.json.results[0].geometry.location.lng
					}).save();
			}
	})
};

var createNewBeer = function(req, newBeerId) {
	// console.log(req.body)
  acctToSave = new Beer ({ 
	'name': req.body.name,
	'active': true,
	'size': req.body.size,
	'initialInventory': true
	});

  newBeerId = acctToSave._id;

  acctToSave.save();

  return newBeerId;
};

var createNewInventoryObj = function(req, newBeerId) {
	// console.log(newBeerId)
	inventoryToSave = new Inventory ({
			'date': moment(),
			'beer': newBeerId,
			'size': req.body.size,
			'orderId': null,
			'user': req.user.id,
			'fulfilled': true,
			'unitNumber': req.body.inventory,
			'initialInventory': true,
			'note': "Initial Inventory"
		}).save();
};

var createManualAdjustmentInventoryObj = function(req, newBeerId) {
	// console.log(newBeerId)
	var inverseInventory = (req.body.inventory) *= -1
	inventoryToSave = new Inventory ({
			'date': moment(),
			'beer': newBeerId,
			'size': req.body.size,
			'orderId': null,
			'user': req.user.id,
			'fulfilled': true,
			'unitNumber': req.body.inventory,
			'initialInventory': false,
			'manualAdjustment': true,
			'user': req.user._id,
			'note': "Manual Adjustment"
		}).save();
};

var createNewOrder = function(req, newOrderId) {
	var orderObj = [], skipper = 1;
	orders = req.body.order;
	// console.log(req.user._id)
	deliveryDate = moment(req.body.deliveryDate).format('L'); 
	orderObj = parseSubmitedBeer(orders);
	if(req.body.allocation){
		createNewAllocation(req, orderObj, function(allocationId){
			var acctToSave = new Order.Order ({ 
				'account': req.body.accountId,
				'date': moment(),
				'deliveryDate': moment(req.body.deliveryDate).format('L'),
				'user': req.user._id,
				'order': orderObj,
				'note': req.body.note,
				'allocation': true,
				'allocationId': allocationId,
				'allocationWeek': moment(req.body.deliveryDate).week()
			})

			newOrderId = acctToSave._id;
			acctToSave.save();

			return newOrderId;
		})
	} else {
		var acctToSave = new Order.Order ({ 
			'account': req.body.accountId,
			'date': moment(),
			'deliveryDate': moment(req.body.deliveryDate).format('L'),
			'deliveryDateString': moment(req.body.deliveryDate).format("dddd, MMMM Do"),
			'order': orderObj,
			'note': req.body.note,
			'user': req.user._id
		})

		newOrderId = acctToSave._id;
		acctToSave.save();



		return newOrderId;
	}
};

var createNewAllocation = function(req, orderObj, callback){
	var newAllocation = new Allocation({
		account: req.body.account,
		frequency: req.body.allocation,
		startDate: req.body.deliveryDate,
		dayOfWeek: moment(req.body.deliveryDate).day(),
		order: orderObj
	})
	var newAllocationId = newAllocation._id
	newAllocation.save();

	callback(newAllocationId)
};

var createUnfulfilledOrderInventory = function(req, newOrderId) {
	orders = req.body.order;
	// console.log(req.body)
	orderObj = parseSubmitedBeer(orders);
	// console.log("In LongAssName: " + newOrderId)

	// console.log("NEW: " + orderObj)

	orderObj.forEach(function(el){
		var idToSearch = el.item, newInvObj;
		Beer.findById(idToSearch, function(err, beer){
			newInvObj = new Inventory ({
				'date': moment(),
				'beer': el.item,
				'unitNumber': el.orderSize,
				'size': beer.size,
				'user': req.user.id,
				'orderId': newOrderId,
				'fulfilled': false,
				'orderSize': el.inventorySize
			}).save();
		})
	})
};

var createRouteObj = function(req, callback){
	var count = -1, result = [];		

	async.whilst(
	    function() { return count < 10; },
		    function(callback) {
		        count++;
			var date = moment().add(count, 'days').format('L'),
				dateForDisplay = moment().add(count, 'days').format("dddd, MMMM Do")

		    Order.Order.find({ route: null, deliveryDate: date, canceled: false })
				.exec(function(err, unassignedOrders){
			Order.Order.find({ route: { $nin: [ null ] }, deliveryDate: date, canceled: false })
				.exec(function(err, assignedOrders){
			Routes.find({ routeDate: date })
				.exec(function(err, routes){

				var totalOrders = unassignedOrders.length + assignedOrders.length
						
				var dateForRoute = null

				if (unassignedOrders[0]){
					dateForRoute = unassignedOrders[0].deliveryDate
				} else if (assignedOrders[0]){
					dateForRoute = assignedOrders[0].deliveryDate
				}

					if(totalOrders === 0) {
						result.push({
							'empty': true,
							'date': date,
							'dateForDisplay': dateForDisplay,
							'dateForRoute': dateForRoute,
							'totalOrders': totalOrders,
							'routes': routes, 
							'unassigned': unassignedOrders, 
							'assigned': assignedOrders })	
					} else {
						result.push({
							'empty': false,
							'date': date, 
							'dateForDisplay': dateForDisplay,
							'dateForRoute': dateForRoute, 
							'totalOrders': totalOrders,
							'routes': routes, 
							'unassigned':unassignedOrders, 
							'assigned': assignedOrders })
					}
					
					// console.log(result)
					callback(null, result)
				})
			})
			})
	    },
	    function (err, n) {
	        // console.log(n)
	        callback(n)
	    }
	);
};

var addNewNote = function(req){
	// console.log(req.body)
	idToSearch = req.body.id
	var noteObj = { 'note': req.body.note, 'author': req.user._id, 'time': moment() };
	Account.findOneAndUpdate({ _id: idToSearch }, { $push: { notes: noteObj } }, function(err, doc){
				// console.log("DOC: " + doc)
			})
}

var addNewRoute = function(req){
	var newRoute = new Routes ({
		'routeName': req.body.routeName,
		'routeDate': moment(req.body.routeDate).format(),
		'routeCreatedBy': req.user._id
	})

	newRoute.save();
};


///
/// Get
///

var getAvailableBeer = function(availableBeer, callback) {
	Beer.find({ 'active': true })
    // .deepPopulate('account')
    .exec(function(err, availableBeer){
    	// console.log("Available Beer: " + availableBeer);

        callback(availableBeer);      
      });
};

var getCurrentOrders = function(dateSelect, callback) {
	Order.Order
    .find({ 
    	canceled: false,
    	delivered: false
    })
    .deepPopulate('order.item account')
    .sort({ deliveryDate: 1,  })
    .exec(function(err, orders){
    	setDeliveryDateString(orders);
      	callback(orders) 
    });    
};

var getAccountInfo = function(id, callback) {
	if (id === null){
	Account
    .find()
    .deepPopulate('notes.author')
    // .select('_id name')
    // .sort(sortBy('name'))
    .exec(function(err, accounts){
    	accounts.sort(sortBy('name'))
    	// console.log("Available Accounts: " + accounts);
    	callback(accounts)     
      });
    } else {
	Account
    .find({ 'name': id })
    .deepPopulate('notes.author')
    // .select('_id name')
    // .sort(sortBy('name'))
    .exec(function(err, account){
    	// accounts.sort(sortBy('name'))
    	// console.log("Accounts Found: " + account);
    	callback(account)     
      });
    }
};

var getBeerInfo = function(id, callback){
	// console.log(id)
	Beer.find({ "_id": id })
	.exec(function(err, beer){
		// console.log(beer)
		callback(beer)
	})
}

var getAccountInfoDetailed = function(accountQuery, callback){
	Account
    .find( {'name': accountQuery} )
    // .sort(sortBy('name'))
    .exec(function(err, accounts){
    	accounts.sort(sortBy('name'))
    	// console.log("Available Accounts: " + accounts);
    	callback(accounts)     
      });
};

var getOrderForEdit = function(req, callback) {
	var orderId = req.params.id;

	Order.Order.findOne({ '_id': orderId })
		.deepPopulate('order.item account user')
		.exec(function(err, order){
			// console.log()
	    	callback(order)     
	      });
};

var getDatesObj = function (orders) {
	var datesArr = [], oldDeliveryDate;
	orders.forEach(function(el){
		if (el.deliveryDateString !== oldDeliveryDate ) {
			datesArr.push(moment(el.deliveryDate).format("MMMM Do YYYY"));
		} else {
			datesArr.push(null);
		}

		oldDeliveryDate = el.deliveryDateString;

	});
	// console.log("DatesArr: " + datesArr[0])
	return datesArr;
};

var getCurrentInventory = function(req, callback) {
	var inventoryArr = [];
	async.waterfall([
			function(next){
				Inventory.find({ 'initialInventory': true })
				.deepPopulate('beer')
				.exec(next)
				}, 
			function(inventoryItems, callback){
				// console.log("Inside Waterfall: " + inventoryItems)
				async.each(inventoryItems, function(el){
					// console.log(el)
					inventoryArr.push({
						'beerId': el.beer._id,
						'beerName': el.beer.name,
						'size': el.size,
						'currentInventory': el.unitNumber,
						'soldButNotDelivered': 0,
						'leftToSell': 0,
						'active': el.beer.active
					});
				})
				callback(null, inventoryArr)
			},
			function(inventoryArr, next){
				Inventory.find({ 'initialInventory': false })
				.deepPopulate('beer')
				.exec(next)
			},
			function(inventoryAdjust, callback){
				async.each(inventoryArr, function(inventory, index){
					async.each(inventoryAdjust, function(adjust, index){
						if(adjust.beer.name === inventory.beerName && adjust.fulfilled === true && adjust.beer.size === inventory.size){
							inventory.currentInventory = inventory.currentInventory - adjust.unitNumber
						}
						if(adjust.beer.name === inventory.beerName && adjust.fulfilled === false && adjust.canceled == false && adjust.beer.size === inventory.size){
							inventory.soldButNotDelivered = inventory.soldButNotDelivered + adjust.unitNumber
						}
						if(inventory.soldButNotDelivered === 0){
							inventory.leftToSell = inventory.currentInventory
						} else {
							inventory.leftToSell = inventory.currentInventory - inventory.soldButNotDelivered
						}
					})
				})
				callback(inventoryArr.sort(sortBy('beerName')));
			}
		], callback)
};

var getOrdersByDate = function(req, callback){
	if(req.params.routeId == 'none'){
		console.log("Inside getOrdersByDate " + req.params.date)

		Order.Order
	    .find({ 
	    	'deliveryDate': req.params.date, 
	    	'canceled': false, 
	    })
	    .deepPopulate('order.item account route')
	    .exec(function(err, orders){
			// console.log("RESULT: " + orders)
	    	setDeliveryDateString(orders);
	    	callback(orders)   
	    });

	} else if (req.params.routeId == 'unassigned') {
		Order.Order
	    .find({ 
	    	'deliveryDate': req.params.date, 
	    	'canceled': false, 
	    	'route': null
	    })
	    .deepPopulate('order.item account route')
	    .exec(function(err, orders){
	    	setDeliveryDateString(orders);
	    	callback(orders);
	      });
	} else {
		Order.Order
	    .find({ 
	    	'deliveryDate': req.params.date, 
	    	'canceled': false, 
	    	'route': req.params.routeId
	    })
	    .deepPopulate('order.item account route')
	    .exec(function(err, orders){
			// console.log("RESULT: " + orders)
	    	setDeliveryDateString(orders);
	    	callback(orders)   
	      });
	}
};

var getExistingRoutes = function(req, callback) {
	Routes.find().exec(function(err, routes){
		// console.log(routes)
		callback(routes)
	})
};

var getRoutes = function(date, callback){
	Routes.find({ 'routeDate': date })
	.exec(function(err, routes){
		// console.log("ROUTES: " + routes)
		callback(routes);
	})
};

var getGoogleMap = function(orders, callback){
	var addressArr = new Array, geocodeArr = new Array;
	async.waterfall([
	    function(callback) {
	    	orders.forEach(function(el){
				var newAddress = {
					name: el.account.name,
					address: el.account.address
				}

				addressArr.push(newAddress);
				// console.log(addressArr)
			});
	        callback(null, addressArr);
	    },
	    function(addressArr, callback) {
	    	addressArr.forEach(function(el){
		    	googleMapsClient.geocode({
			  	  address: el.address,
			      language: 'en'
					}, function(err, response) {
			  			if (!err) {
			  				// console.log(addressArr.name)
			  				geocodeArr.push({
			  					title: el.name,
			  					lat: response.json.results[0].geometry.location.lat,
			  					lng: response.json.results[0].geometry.location.lng
			  				})
			    			// console.log(response.json.results[0].geometry.location.lat);
			  			}
					});
		    	})
			
			// console.log(geocodeArr)
	        callback(null, geocodeArr);
			}
	], function (err, geocodeArr) {
		callback(geocodeArr)		
	});
};

var getOrdersByAccount = function(accountQuery, callback){
	// console.log("Query: " + accountQuery)

	Account
	.find({ 'name': accountQuery })
	.deepPopulate('notes.author')
	// .select('_id')
	.exec(function(err, account){
		// console.log("Account: " + account)
		Order.Order.find({ 'account': account})
		.deepPopulate('account order.item route')
		.exec(function(err, orders){
			// console.log(orders)
			callback(orders)		
		})
	})
};

var getRouteInfo = function(req, callback){
	Routes.find()
	.exec(function(err, routes){
		callback(routes)
	})
};

var getInventoryById = function(req, callback){
	var idToSearch = req.params.id

	Order.Order.find({ "order.item": idToSearch })
		.deepPopulate('account order.item')
		// .sort('deliveryDate')
		.exec(function(err, orders){
		Inventory.find({ "beer": idToSearch, "orderId": null })
		.exec(function(err, inventory){
			var newArr = orders.concat(inventory)
			// console.log(newArr)
			callback(newArr)
		})
	})
}

var getAllDeliveries = function(req, callback){
	Order.Order.find()
	.exec(function(err, orders){
		callback(orders)
	})
}


///
/// Set
///

var setDeliveryDateString = function(orders) {
    orders.forEach(function(el){
		var deliveryDateString = moment(el.deliveryDate).format("dddd, MMMM Do")
		Order.Order.findByIdAndUpdate(el._id, { 'deliveryDateString': deliveryDateString }, function(err, item){
			console.log("Item: " + item._id + " DeliveryDateString Updated ")
		})

		return el.deliveryDateString = deliveryDateString
	});
};

var updateOrder = function(req) {
	var orders = req.body.order, orderItemId = req.body.orderItemId, orderObj, orderId;

	orderObj = parseSubmitedBeer(orders)
	
	Order.Order.findOneAndUpdate({ '_id': req.body.orderId }, 
		{ $set: { order: orderObj } }, function(err, doc) {
		orderId = doc._id
		for(var i = 0; i < orderObj.length; i++) {

			var item = orderObj[i].item, orderSize = orderObj[i].orderSize

			Inventory.findOneAndUpdate(
				{ 'beer': item, 'orderId': orderId }, 
				{ $set: { unitNumber: orderSize }}, 
				{ upsert: true, new: true, setDefaultsOnInsert: true }, 
				function(err, el){
					if (err) {
			        } else {
			        	return el
			        }
				})
		}
	});
};

var updateCanceledInventory = function(req) {
	var query = { orderId: req.params.id };
	// console.log(req.params)
	Inventory.find(query, function(err, doc){
		// console.log('DOC:' + doc)
		doc.forEach( function(el, index) {
			// console.log(el.canceled)
			el.canceled = true;
			el.save(function (err) {
        		if(err) {
            		console.error('ERROR!');
        		}
    		});
		});
	})
};

var addInventoryToBeerObj = function(beerId) {
	// console.log(beerId)
	beerId.forEach( function(el, index) {
		// console.log("beerId ForEach: " + el)

		// Inventory.find({ 'beer': el._id }), function(inventory){
		// 	// console.log("Beer Inventory: " + inventory);
		// }
	});
	return beerId
};

var updateOneClick = function(id, update) {
	Order.Order.findByIdAndUpdate(id, { $set: update }, function(err, el){
		// console.log("Beer Updated!")
	})
};

var updateInventory = function(req, arr) {
	// console.log("ARRAY: " + arr);
	var currentInventory, idForSearch;
	arr.forEach(function(el){
		idForSearch = el.id
		if (el.inventorySize != 0){
			Beer.findById(idForSearch, function(err, beer){
				// console.log(beer)
				var newInv = new Inventory ({
				'date': moment(),
				'beer': el.id,
				'size': beer.size,
				'orderId': null,
				'user': req.user.id,
				'unitNumber': el.inventorySize,
				'note': "Manual Adjust"
				}).save();
			});
		}
	});
};

var updatebeer = function(req) {
	Beer.findOneAndUpdate({ '_id': req.body.id }, 
		{ $set: { name: req.body.name, active: req.body.active } }, function(err, doc) {
	})
}


///
/// Parse
///

var parseSubmitedBeer = function(beersToParse) {
	var orderObj = [], skipper = 1;

	// console.log("Before Parsing: " + beersToParse)
	
	for (var i = 0; i < beersToParse.length; i++) {
		if (i == skipper){
			// console.log("Skipper: " + skipper);
		} else {
			if (beersToParse[i + 1 ] == 0) {
				// console.log("Empty Order")
			} else {
				orderObj.push({
					item: beersToParse[i],
					orderSize: beersToParse[i + 1]
			})
		}
			skipper = i + 1;
		}
	}

	// console.log("After Parsing: " + orderObj);
	// console.log("OrderObj: " + orderObj)
	return orderObj;
};

var parseInventoryUpdate = function(req, res, next) {
	var orderObj = [], 
		bodyToParse = req.body, 
		lengthToParse = bodyToParse.inventory.length - 1, 
		skipper = 1;

	for (var i = 0; i < lengthToParse; i++) {
		if (i == skipper){
			// console.log("Skipper: " + skipper);
		} else {
			if (bodyToParse[i + 1 ] == 0) {
				// console.log("Empty Order")
			} else {
				orderObj.push({
					id: bodyToParse.inventory[i],
					inventorySize: bodyToParse.inventory[i + 1]
			})
		}
			skipper = i + 1;
		}

	}
	// console.log(orderObj);

	return orderObj;
};

var updateInventoryForDelivered = function(orderId){
	Inventory.find({ 'orderId': orderId }, function(err, el){
		for(var i = 0; i < el.length; i++) {
			Inventory.findOneAndUpdate({ 'orderId': orderId, '_id': el[i]._id }, 
				{ $set: { fulfilled: true }}, function(err, el){console.log("Updated Inventory")})
		};
	})
};


///
/// Util
///

var countItemsInOrder = function(date, orders, callback) {
	var itemsInOrder = []
	// console.log(orders)
	orders.forEach(function(order){
		// console.log(order.order.length)
		for(var i = 0; i < order.order.length; i++){
			itemsInOrder.push({
				'beerId': order.order[i].item._id,
				'beerName': order.order[i].item.name,
				'size': order.order[i].item.size,
				'onOrder': order.order[i].orderSize
			})
		}	
	})
	var result = [];
	// console.log(itemsInOrder)
	itemsInOrder.forEach(function (a) {
		// console.log(this)
		// console.log(this[a.beerId])
	    if (!this[a.beerId]) {
	        this[a.beerId] = { beerId: a.beerId, beerName: a.beerName, size: a.size, onOrder: 0 };
	        result.push(this[a.beerId]);
	    }
	    this[a.beerId].onOrder += a.onOrder;
	}, Object.create(null));
	// console.log("RESULT: " + result)
	callback(result)
};

var checkForUnassignedRoute = function(date, callback){
	Order.Order.find({ 'route': null, deliveryDate: date })
	.exec(function(err, unassignedOrders){
		async.groupBy(unassignedOrders._id, function(_id, callback) {
		    db.findById(userId, function(err, user) {
		        if (err) return callback(err);
		        return callback(null, unassignedOrders);
		    });
		}, function(err, result) {
			// console.log(result)
		}); ////////THIS SHOLD GROUP HOW YOU WANT!!!



		callback(unassignedOrders)

	})
};

var findOverdueOrders = function(req, callback) {
	var todaysDate = moment().subtract(1, 'days');
	 Order.Order.find({ deliveryDate: { $lt: todaysDate }, canceled: 'false', delivered: 'false' })
	 .deepPopulate('account order')
	 .exec(function(err, overdueOrders){
	 	console.log(overdueOrders)
	 	callback(overdueOrders)
	 })
};

module.exports = function(passport){

///
/// Root
///

router.get('/', function(req, res, next) {
	// convertOldAccounts();
	// updateMapsGeocode();
  res.render('index', { user: null });
});


///
/// Authentication
///

router.get('/login', function(req, res, next) {
  res.render('login', { user: null });
});

router.post('/login', passport.authenticate('login', {
	successRedirect: '/dashboard',
	failureRedirect: '/'
}));

router.get('/signup', function(req, res, next) {
	res.render('signup', { user: null });
});

router.post('/signup', passport.authenticate('signup', {
	successRedirect: '/dashboard',
	failureRedirect: '/'
}));

router.get('/logout', function (req, res, next) {
	req.logout();
  	res.redirect('/');
});


///
/// Dashboard
///

router.get('/dashboard', isAuthenticated, function (req, res, next) {
	var orders, datesArr, inventoryArr;

	getCurrentInventory(req, function(inventory){
		getCurrentOrders(null, function(orders){
		getAccountInfo(null, function(accounts){
		getRouteInfo(req, function(routes){
		createRouteObj(req, function(routeObj){
		findOverdueOrders(req, function(overdueOrders){
			console.log(routeObj)
			res.render('dashboard', {
				user: req.user,
				orders: orders,
				inventory: inventory,
				accounts: accounts,
				routes: routes,
				routeObj: routeObj,
				overdueOrders: overdueOrders,
				moment: moment
			});
		})
		})
		})
		})
		})
	})
})


///
/// Daily Dashboard
///

router.get('/sortByDate=:date-routeId=:routeId', isAuthenticated, function(req, res, next){
	var dateForSorting = moment(req.params.date).format('L');
	getOrdersByDate(req, function(orders){
		countItemsInOrder(dateForSorting, orders, function(itemsInOrder){
			getRoutes(dateForSorting, function(route){
				getGoogleMap(orders, function(geocodeArr){
					res.render('listOrders', {
						user: req.user,
						orders: orders,
						stops: geocodeArr,
						itemsInOrder: itemsInOrder,
						routes: route,
						params: req.params,
						moment: moment
					});
				});
			});
		});
	});
});

router.get('/printer_sortByDate=:date-routeId=:routeId', isAuthenticated, function(req, res, next){
	var dateForSorting = moment(req.params.date).format('L');
	getOrdersByDate(req, function(orders){
		countItemsInOrder(dateForSorting, orders, function(itemsInOrder){
			getRoutes(dateForSorting, function(route){
				getGoogleMap(orders, function(geocodeArr){
					res.render('listOrders_print', {
						user: req.user,
						orders: orders,
						stops: geocodeArr,
						itemsInOrder: itemsInOrder,
						routes: route,
						params: req.params
					});
				});
			});
		});
	});
})

router.get('/all_deliveries', isAuthenticated, function(req, res, next){
	getAllDeliveries(req, function(deliveries){
		res.render('all_deliveries', {
			user: req.user,
			deliveries: deliveries,
			moment: moment
		})
	})
})


///
/// Accounts
///

router.get('/account/account-dashboard', isAuthenticated, function(req, res, next){
	getAccountInfo(null, function(accounts){
	res.render('account-dashboard', {
			user: req.user,
			accounts: accounts
		})
	})
})

router.get('/account/account-details_:name', isAuthenticated, function(req, res, next){
	// console.log(req.params)
	getAccountInfo(req.params.name, function(accountInfo){
		getOrdersByAccount(req.params.name, function(orders){
			// console.log(accountInfo)
			// console.log(orders)
			res.render('account-details', {
				user: req.user,
				account: accountInfo,
				orders: orders,
				moment: moment
			})	
		})
	})
})

router.get('/account/newaccount', isAuthenticated, function (req, res, next) {
	getAccountInfo(null, function(accounts) {
		res.render('newaccount', { 
			user: req.user,
			accounts: accounts
		});
	});
});

router.post('/account/newaccount', isAuthenticated, function(req, res, next) {
	createNewAccount(req);
	res.redirect('/dashboard')
});

router.post('/account/newNote', isAuthenticated, function(req, res, next) {
	addNewNote(req);
	res.redirect('back')
});


///
/// Inventory
///

router.get('/inventory/:id', isAuthenticated, function(req, res, next) {
	getInventoryById(req, function(inventory){
	getBeerInfo(req.params.id, function(beer){
	getCurrentInventory(req, function(inventoryCount){
		res.render('inventory-detail', {
			user: req.user,
			inventory: inventory,
			beer: beer,
			moment: moment,
			inventoryCount: inventoryCount
		})	
	})
	})
	})
});

router.get('/inventory', isAuthenticated, function(req, res, next) {
	getCurrentInventory(req, function(inventory){
		// console.log("Before Render: " + inventory)
		res.render('inventory', {
			user: req.user,
			inventory: inventory
		})
	})		
});

router.post('/update_inventory', isAuthenticated, function(req, res, next) {
	createManualAdjustmentInventoryObj(req, req.body.beerId);
	res.redirect('back');
});


///
/// Order
///

router.get('/order', isAuthenticated, function (req, res, next) {
	var availableBeer, orderInfoObj = {'accounts': [], 'beer': []};
	
	getAccountInfo(null, function(accounts) {
		orderInfoObj.accounts = accounts;
	
	getAvailableBeer(availableBeer, function(availableBeer) {
	getCurrentInventory(req, function(currentInventory){
		orderInfoObj.beer = availableBeer
		orderInfoObj.beer = addInventoryToBeerObj(availableBeer)
		// console.log("Order Account Obj: " + orderInfoObj.accounts)
		// console.log("Order Beer Obj: " + orderInfoObj.beer)
		// console.log("Whole Order Info Obj: " + orderInfoObj)
		res.render('order', {
			user: req.user,
			beer: orderInfoObj.beer,
			accounts: orderInfoObj.accounts,
			currentInventory: currentInventory
		});
	})
	});
	});
});

router.get('/edit_itemToEdit=:id', isAuthenticated, function(req, res, next) {
	getOrderForEdit(req, function(order){
		getCurrentInventory(req, function(inventory){
			// console.log(inventory[0])
			res.render('edit_order',{
				user: req.user,
				order: order,
				account: order.account,
				beer: order.order,
				availableBeer: inventory,
				moment: moment
			});
		})
	})
}); /// Edit Order

router.post('/update_date', isAuthenticated, function(req, res, next){
	var newDate = moment(req.body.deliveryDate), orderId = req.body.orderItemId;

	// find the orderById and update the date
	updateOneClick(req.body.orderItemId, { deliveryDate: newDate, route: null })
	res.redirect('back');
}) /// Update Order Date

router.post('/order', isAuthenticated, function (req, res, next) {
	// console.dir(req.body)
	var newOrderId;
	newOrderId = createNewOrder(req, newOrderId);
	// console.log("In Route: " + newOrderId)
	createUnfulfilledOrderInventory(req, newOrderId);
	res.redirect('back')
}); /// New Order

router.post('/update_order', isAuthenticated, function(req, res, next) {
	var ordersToUpdate, orderArr = [];
	updateOrder(req)
	res.redirect('back');
}); /// 

router.get('/delivered/:id', isAuthenticated, function(req, res, next) {
	var orderId = req.params.id;
	updateOneClick(orderId, { delivered: true });
	updateInventoryForDelivered(orderId);
	res.redirect('back');
})

router.get('/delete/:id', isAuthenticated, function(req, res, next){
	var orderId = req.params.id;
	updateOneClick(orderId, { canceled: true });
	updateCanceledInventory(req);
	res.redirect('/dashboard');
})

router.post('/delivered/:id/', isAuthenticated, function(req, res, next) {
	var orderId = req.params.id;
	updateOneClick(orderId, { delivered: true });
	updateInventoryForDelivered(orderId);
	res.redirect('/dashboard');
});

router.post('/invoiced/:id', isAuthenticated, function(req, res, next) {
	var orderId = req.params.id;
	updateOneClick(orderId, { invoiced: true });
	res.redirect('/dashboard');
});

router.post('/delete/:id', isAuthenticated, function(req, res, next) {
	var orderId = req.params.id;
	updateOneClick(orderId, { canceled: true });
	updateCanceledInventory(req);
	res.redirect('/dashboard');
});


///
/// Beers
///

router.get('/newbeer', isAuthenticated, function (req, res, next) {
	getAvailableBeer(req, function(allBeers){
			res.render('newbeer', { 
				user: req.user,
				beer: allBeers
		});
	});
});

router.get('/edit/:id', isAuthenticated, function(req, res, next) {
	getBeerInfo(req.params.id, function(beerInfo){
		res.render('edit-beer', {
			user: req.user,
			beerInfo: beerInfo
		})
	})
});

router.post('/editbeer', isAuthenticated, function(req, res, next) {
	updatebeer(req);
	res.redirect('back');
})

router.post('/newbeer', isAuthenticated, function (req, res, next) {
	var newBeerId;
	newBeerId = createNewBeer(req);
	createNewInventoryObj(req, newBeerId, true);
	res.redirect('back');
});


///
/// Routes
///

router.get('/newRoute_:date', isAuthenticated, function(req, res, next){
	var convertedDate = moment(req.params.date).format("YYYY-MM-DD")
	// console.log(req.params.date)
	// console.log(convertedDate)
	getExistingRoutes(req, function(routes){
		if (!routes){
			res.render('newRoute', {
				user: req.user
			})	
		}
		res.render('newRoute', {
			user: req.user,
			params: convertedDate,
			routes: routes
		})		
	})
})

router.post('/newRoute', isAuthenticated, function(req, res, next){
	addNewRoute(req);
	res.redirect('back')
})

router.post('/assignRoute', isAuthenticated, function(req, res, next) {
	var routesToUpdate = req.body.route;
	var newArr = []
	// console.log("Routes To Update: " + typeof routesToUpdate)
	if (typeof routesToUpdate === 'object'){
		for(var i = 0; i < routesToUpdate.length; i++){
			var newString = routesToUpdate[i].match(/\S+/g);
			var newObj = { 'orderId': newString[0], 'routeId': newString[1] }
			newArr.push(newObj);
		}
		newArr.forEach(function(el){
			Order.Order.findOneAndUpdate({ _id: el.orderId }, { $set: { route: el.routeId }}, function(err, doc){
				// console.log("DOC: " + doc)
			})
		})
		// console.log(newArr)
	} else {
		// console.log("Else")
		var newString = routesToUpdate.match(/\S+/g);
		// var newObj = { 'orderId': newString[0], 'routeId': newString[1] }
		Order.Order.findOneAndUpdate({ _id: newString[0] }, { $set: { route: newString[1] }}, function(err, doc){
		})
	}
	
	res.redirect('back');	
});


///
/// System
///

router.get('/addDeliveryDateString', function(req, res, next) {
	Order.Order
    .find()
    .exec(function(err, orders){
    	setDeliveryDateString(orders);
    });    
	res.redirect('/')
})


return router;

}