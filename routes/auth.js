const express = require('express')
const router = express.Router()
const getDb = require('../util/database').getDb
const { check, body } = require('express-validator')

const authController = require('../controllers/auth')

router.get('/login', authController.getLogin)
router.get('/signup', authController.getSignup)

router.post('/logout', authController.postLogout)
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter Invalid Email')
      .normalizeEmail(),

    body('password', 'Please enter Invalid Password')
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
)
router.post(
  '/signup',
  [
    check('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .custom((value, { req }) => {
        const db = getDb()
        return db
          .collection('users')
          .findOne({ email: value })
          .then((userDoc) => {
            if (userDoc) {
              return Promise.reject(
                'E-mail exists already, please pick a different one'
              )
            }
          })
      })
      .normalizeEmail(),
    body(
      'password',
      'Please Enter a password with only numbers and text characters at least 5.'
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords have to match.')
        }
        return true
      })
      .trim(),
  ],
  authController.postSignup
)

router.get('/reset', authController.getReset)
router.post('/reset', authController.postReset)

router.get('/reset/:token', authController.getNewPassword)
router.post('/new-password', authController.postNewPassword)

module.exports = router
