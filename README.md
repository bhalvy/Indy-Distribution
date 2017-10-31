# Indy Distribution

A simple web app to manage inventory, take orders, plan routes, and deliver items. Designed with the needs of small to mid-sized independent breweries in mind.

### Runs On 
- node.js
- mongodb


### Installation
clone this repository
```
git clone https://github.com/bhalvy/delivbeer
```

Install npm packages
```
npm install
```

Connect to a mongodb using mongoose
##### IMPORTANT additional steps **must** be taken to make this database connection secure
```
//app.js

var mongoose = require('mongoose');
mongoose.connect('INSERT MONGO URL', {
  useMongoClient: true,
  });
```

create a unique express-session secret [read more](https://github.com/expressjs/session)
```
app.use(expressSession({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));
```

### Execution
start app
```
node app.js
```

Log into homepage and setup a new account.

### Security
As it currently is written ANYONE can register for an account. Only share the URL with trusted individuals. This issue has been flagged for improvement immediatly.

### About
This software was developed for use by Independent Breweries by [Assignment Creative](http://assignmentcreative.com).  It is offered under GNU GPLv3.


