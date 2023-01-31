const express = require('express');
//const fs = require('fs');
const app = express();
const path = require('path');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
const bcrypt = require('bcrypt');

const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin:PxWqVTmD6FDxsr06@ecommerce.gsti1jn.mongodb.net/?retryWrites=true&w=majority').then(console.log('connected'));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
});

//session
app.use(session({
    secret: 'elissa',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db
    })
}));

//import schemas
const products = require('./models/products')
var User = require('./models/users');
var purchases = require('./models/purchases');

const bodyParser = require("body-parser");
const { findById } = require('./models/products');
const users = require('./models/users');
app.use(bodyParser.json());
//const multer = require('multer');
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "style")))
app.use("/images", express.static("images"))

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"))


//render home page
app.get('/', (req, res) => {
    //set session loggedin to false if no user is logged in
    if (!req.session.isLoggedIn) {
        req.session.isLoggedIn = false;
    }
    console.log("logged in: " + req.session.isLoggedIn)
    res.render('home', {
        isLoggedIn: req.session.isLoggedIn,
        role: req.session.role
    });
})

//storage
// var storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads');
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.fieldname + '-' + Date.now())
//     }

// })

// var upload = multer({
//     storage: storage
// })

//render login page
app.get('/signup', (req, res) => {
    res.render('signup')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/forget', (req, res) => {
    res.render('forget');
})


app.get('/profile', (req, res, next) => {
    //find id of the user in the session
    User.findOne({ unique_id: req.session.userId }, function (err, data) {
        console.log("data");
        console.log(data);

        //if id not found, render home page
        if (!data) {
            res.redirect('/');
        }
        //if id is found, go to profile and display details
        else {
            //console.log("found");
            return res.render('profile', { 
                "name": data.fullname, "email": data.email,
                isLoggedIn: req.session.isLoggedIn,
                role: req.session.role
            });
        }
    });
})

//news letter
app.get('/thankyou', (req, res) => {
    res.render('thankyou')
})

//render products page
app.get('/browse', async (req, res) => {
    const entries = await products.find({}); //find all entries
    //console.log(entries)
    res.render('browse', { products: entries , 
        isLoggedIn: req.session.isLoggedIn,
        role: req.session.role})
})

//render upload form(for admins)
app.get('/adminupload', (req, res) => {
    res.render('upload')
})

// upload using PATH
app.post('/upload', async (req, res) => {
    await products.create({
        name: req.body.bookname,
        author: req.body.bookauthor,
        path: req.body.path,
        price: req.body.bookprice
    })
    res.redirect('/browse')
})

//upload new item
//---- using multer -----

// app.post('/upload', upload.single('photo'), (req, res, next) => {
//     console.log(req.file);
//     const newImage = new products({
//         name: req.body.bookname,
//         author: req.body.bookauthor,
//         photo: {
//             data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
//             contentType: 'image/png'
//         },
//         price: req.body.bookprice
//     })
//     newImage.save()
//         .then(() => res.send('successfully uploaded'))
//         .catch(err => console.log(err));

//     res.redirect('/browse');
// })




//add to cart
var cartArr = [];
app.get('/shoppingcart', (req, res) => {
    console.log(cartArr);

    res.render('cart', { item: cartArr })
});

app.get('/addtocart/:id', async (req, res) => {
    const product = await products.findById(req.params.id); //find product by id
    cartArr.push(product); //add product to array
    res.redirect('/browse');

});

app.post('/deleteitem/:id', async(req, res)=>{
    await products.findByIdAndDelete(req.params.id);
    res.redirect('/browse');
})

//click checkout
app.post('/checkout', (req, res) => {

    //find most recent data in purchases
    purchases.findOne({}, (err, data) => {
        var order_id;
        if (data) {
            order_id = data.orderId + 1; //increment orderId by 1
        }
        else {
            order_id = 1;
        }

        //create new order
        var newOrder = new purchases({
            userId: req.session.userId,
            orderId: order_id,
            date: new Date()
        })

        //save new order
        newOrder.save((err, order) => {
            if (err)
                console.log(err);
            else
                console.log('Success');
        })
    }).sort({ _id: -1 }).limit(1);
    cartArr.length = 0; //empty cart array
    res.redirect('/purchase')

})

app.get('/purchase', async (req, res) => {
    //find all purchases done by the sessions id
    const order = await purchases.find({ userId: req.session.userId });
    console.log(order);
    res.render('purchase', { orders: order });
})

app.get('/users', async(req, res)=>{
    const users = await User.find({});
    res.render('viewusers', {users: users});
})


app.post('/delete/:id', async(req, res)=>{
    await users.findByIdAndDelete(req.params.id); 
    res.redirect('/users');
})

app.post('/update/:id', async(req, res)=>{
    var newRole;
    const person = await users.findById(req.params.id);
    console.log(person);
    if(person.role == "user"){
        newRole = "admin";
    }
    else{
        newRole = "user";
    }
    const userid = req.params.id;
    await users.findByIdAndUpdate(userid, {role: newRole});
    res.redirect('/users');
})

//user signup
app.post('/', async (req, res, next) => {
    console.log(req.body);
    var personInfo = req.body;

    //hash password
    var encryptedPass;

    try {
        encryptedPass = await bcrypt.hash(req.body.password, 10);
        console.log('done');
    }
    catch {
        console.log(err);
    }

    //check for empty fields
    if (!personInfo.email || !personInfo.password || !personInfo.passwordConf || !personInfo.name) {
        res.send("emptyfields: one of the fields are empty");
    }
    else {
        //check if passwords are equal
        if (personInfo.password == personInfo.passwordConf) {

            //check if email already exists
            User.findOne({ email: personInfo.email }, (err, data) => {
                //if it doesnt, create new account
                if (!data) {
                    var c;
                    User.findOne({}, (err, data) => {

                        if (data) {
                            console.log("if");
                            c = data.unique_id + 1;
                        }
                        else {
                            c = 1;
                        }

                        var newPerson = new User({
                            unique_id: c,
                            fullname: personInfo.name,
                            email: personInfo.email,
                            phone: personInfo.phone,
                            address: personInfo.address,
                            password: encryptedPass, //store hashed password here
                        });

                        newPerson.save(function (err, Person) {
                            if (err)
                                console.log(err);
                            else
                                console.log('Success');
                        });
                    }).sort({ _id: -1 }).limit(1);

                    res.send({ "Success": "You are regestered,You can login now." });
                }
                //if email already exists
                else {
                    res.send({ "Success": "Email is already used." });
                }
            })
        }
        //if passwords are not matched
        else {
            res.send({ "Success": "password is not matched" });
        }
    }
})

//user login
app.post('/login', (req, res, next) => {

    //find email
    User.findOne({ email: req.body.email }, function (err, data) {

        //if it is found
        if (data) {
            //compare passwords
            bcrypt.compare(req.body.password, data.password, function (err, result) {
                if (result) {
                    req.session.userId = data.unique_id; 
                    req.session.isLoggedIn = true;
                    req.session.role = data.role;
                    res.send({ "Success": "Success!" });
                }
                else {
                    res.send({ "Success": "Wrong password!" });
                }
            })
        }
        else {
            res.send({ "Success": "This Email Is not regestered!" });
        }
    })
})

//forget password
app.post('/forget', async function (req, res, next) {

    //hash new password
    var encryptedPass;

    try {
        encryptedPass = await bcrypt.hash(req.body.password, 10);
        console.log('done');
    }
    catch {
        console.log('err');
    }

    //check if email exists
    User.findOne({ email: req.body.email }, function (err, data) {
        console.log(data);

        //if it doesnt exist
        if (!data) {
            res.send({ "Success": "This Email Is not regestered!" });
        }
        //if it exists
        else {
            //check if passwords are equal
            if (req.body.password == req.body.passwordConf) {
                data.password = encryptedPass; //set new password to hashed password

                //save new data
                data.save(function (err, Person) {
                    if (err)
                        console.log(err);
                    else
                        console.log('Success');
                    res.send({ "Success": "Password changed!" });
                });
            }
            else {
                res.send({ "Success": "Password does not matched! Both Password should be same." });
            }
        }
    });

});

app.get('/logout', (req, res, next) => {
    console.log('logout');
    if (req.session) {
        // delete session object
        req.session.destroy(function (err) {
            if (err) {
                return next(err);
            } else {
                return res.redirect('/'); //if successful, render home
            }
        });
    }
})

app.listen('5006')