const https = require('https')
const path = require('path')
const fs = require('fs')
const express = require('express')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)
const bodyParser = require('body-parser')
const multer = require('multer')
const csrf = require('csurf')
const flash = require('connect-flash')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const mongoConnect = require('./util/database').mongoConnect
const User = require('./models/user')

const errorController = require('./controllers/error')

// MONGODB  connection string
const MONGODB_URI = process.env.DATABASE_CONNECTION_STRING

const app = express()
const store = new MongoDBStore({ uri: MONGODB_URI, collection: 'sessions' })

const csrfProtection = csrf()

// SSL options
// const privateKey = fs.readFileSync('server.key')
// const certificate = fs.readFileSync('server.cert')

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images')
  },
  filename: (req, file, cb) => {
    cb(null, '' + Date.now() + '-' + file.originalname)
    // cb(null, file.originalname)
  },
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

app.set('view engine', 'ejs')
app.set('views', 'views')

const adminRoutes = require('./routes/admin')
const shopRoutes = require('./routes/shop')
const authRoutes = require('./routes/auth')
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
)
app.use(helmet())
app.use(compression())
app.use(morgan('combined', { stream: accessLogStream }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)
app.use(express.static(path.join(__dirname, 'public')))
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use(
  session({
    secret: 'top secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  })
)
app.use(csrfProtection)
app.use(flash())

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn
  res.locals.csrfToken = req.csrfToken()
  next()
})
/************************************************************************** */
app.use((req, res, next) => {
  if (!req.session.user) {
    return next()
  }
  User.findById(req.session.user._id.toString())
    .then((user) => {
      if (!user) {
        return next()
      }
      req.session.user = new User(
        user.email,
        user.password,
        user.cart,
        user._id
      )
      next()
    })
    .catch((err) => {
      next(new Error('Authentication User Error, ', err))
    })
})
/************************************************************************** */

app.use('/admin', adminRoutes)

app.use(shopRoutes)
app.use(authRoutes)

app.get('/500', errorController.get500)
app.use(errorController.get404)

app.use((error, req, res, next) => {
  console.log('Error: ', error)
  res.redirect('/500')

  // res.status(500).render('500', {
  //   pageTitle: 'Error!',
  //   path: '/500',
  //   isAuthenticated: req.session.isLoggedIn,
  // })
})

mongoConnect(() => {
  // https
  // .createServer({ key: privateKey, cert: certificate }, app)
  // .listen(process.env.PORT || 3000)
  app.listen(process.env.PORT || 3000)
})
