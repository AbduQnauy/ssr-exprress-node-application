const crypto = require('crypto')
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const mongodb = require('mongodb')
const User = require('../models/user')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const { error } = require('console')
const getDb = require('../util/database').getDb

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        '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',
    },
  })
)

// const getDb = require('../util/database').getDb

exports.getLogin = (req, res, next) => {
  let message = req.flash('error')
  message = message.length > 0 ? message[0] : null
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    },
    validationErrors: [],
  })
}

exports.getSignup = (req, res, next) => {
  let message = req.flash('error')
  message = message.length > 0 ? message[0] : null
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationErrors: [],
  })
}
exports.postSignup = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    console.log('Errors: ', errors.array())
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    })
  }
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User(email, hashedPassword, { items: [] })
      return user.save()
    })
    .then((result) => {
      res.redirect('/login')
      return transporter.sendMail({
        to: email,
        from: 'abduqnauy@hotmail.com',
        subject: 'Signup Succeeded',
        html: '<h1>You Successfully signed up!</h1>',
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postLogin = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    })
  }

  const db = getDb()
  db.collection('users')
    .findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash('error', 'Invalid email or password')
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'login',
          errorMessage: 'Invalid email or password',
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: [],
        })
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true
            req.session.user = user
            return req.session.save((err) => {
              if (err) {
                console.log('Saving User Error: ', err)
              }

              res.redirect('/')
            })
          } else {
            // console.log('Errors: ', errors.array())
            return res.status(422).render('auth/login', {
              path: '/login',
              pageTitle: 'login',
              errorMessage: 'Invalid email or password',
              oldInput: {
                email: email,
                password: password,
              },
              validationErrors: errors.array(),
            })
          }
        })
        .catch((err) => {
          console.log('Login User Error: ', err)
          res.redirect('/login')
        })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('Error while Destrying Sesssion: ', error)
    }
    res.redirect('/')
  })
}

exports.getReset = (req, res, next) => {
  let message = req.flash('error')
  message = message.length > 0 ? message[0] : null
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message,
  })
}
exports.postReset = (req, res, next) => {
  return crypto.randomBytes(32, (err, buffer) => {
    const db = getDb()
    if (err) {
      console.log('Error while Reset Password')
      res.redirect('/reset')
    }

    const token = buffer.toString('hex')
    return db
      .collection('users')
      .findOneAndUpdate(
        { email: req.body.email },
        {
          $set: {
            resetToken: token,
            resetTokenExpiration: Date.now() + 3600000,
          },
        },
        { returnDocument: 'after' }
      )
      .then((user) => {
        if (!user) {
          console.log('No Pass')
          req.flash('error', 'No account with that email found!')
          return res.redirect('/reset')
        } else {
          // console.log('Passed, User is: ', user)
          // console.log('Updated Successfully')

          res.redirect('/')

          return transporter.sendMail({
            to: req.body.email,
            from: 'abduqnauy@hotmail.com',
            subject: 'Password Reset',
            html: `
          <p>You requested a password reset</p>
          <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password </p>
          `,
          })
        }
      })
      .catch((err) => {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
      })
  })
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token
  const db = getDb()
  db.collection('users')
    .findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    })
    .then((user) => {
      let message = req.flash('error')
      message = message.length > 0 ? message[0] : null
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password
  const userId = req.body.userId
  const passwordToken = req.body.passwordToken
  let resetUser

  const db = getDb()
  db.collection('users')
    .findOne({
      _id: new mongodb.ObjectId(userId),
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
    })
    .then((user) => {
      // console.log('User: ', user)
      resetUser = user
      return bcrypt.hash(newPassword, 12)
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword
      resetUser.resetToken = undefined
      resetUser.resetTokenExpiration = undefined
      return resetUser
    })
    .then((updatedUser) => {
      // console.log('Updated User: ', updatedUser)
      res.redirect('/login')
      return db
        .collection('users')
        .updateOne({ _id: updatedUser._id }, { $set: updatedUser })
    })
    .then((result) => {
      console.log('Updated done successfully: ', result)
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}
