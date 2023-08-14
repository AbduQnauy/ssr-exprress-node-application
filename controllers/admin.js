const Product = require('../models/products')
const { validationResult } = require('express-validator')
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  })
}
const fileHelper = require('../util/file')

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title
  const image = req.file
  const price = req.body.price
  const description = req.body.description
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description,
      },
      hasError: true,
      errorMessage: 'Attached file is not an image.',
      validationErrors: [],
    })
  }

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    console.log('Errors: ', errors)
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      isAuthenticated: req.session.isLoggedIn,
      validationErrors: errors.array(),
    })
  }

  const imageUrl = image.path
  const product = new Product(
    title,
    price,
    description,
    imageUrl,
    null,
    req.session.user._id
  )
  product
    .save()
    .then((result) => {
      res.redirect('/admin/products')
    })
    .catch((err) => {
      // const error = new Error(err)
      // error.httpStatusCode = 500
      next(err)
      // next()
    })
}

exports.getEditProduct = (req, res, next) => {
  // Receive property from query string then convert string value to boolean
  const editMode = new RegExp('true').test(req.query.edit)
  if (!editMode) return res.redirect('/')
  const prodId = req.params.productId
  Product.findById(prodId)
    // .getProducts({ where: { id: prodId } })
    // Product.findByPk(prodId)
    .then((product) => {
      if (!product) return res.redirect('/')
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        isAuthenticated: req.session.isLoggedIn,
        validationErrors: [],
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getProducts = (req, res, next) => {
  Product.fetchAll({ userId: req.session.user._id.toString() })

    // Product.fetchAll({})
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        isAuthenticated: req.session.isLoggedIn,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId
  const updatedTitle = req.body.title
  const updatedPrice = req.body.price
  const image = req.file
  const updatedDesc = req.body.description

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      isAuthenticated: req.session.isLoggedIn,
      validationErrors: errors.array(),
    })
  }

  const product = new Product(
    updatedTitle,
    updatedPrice,
    updatedDesc,
    image?.path,
    prodId,
    req.session.user._id
  )
  product
    .save(req.session.user._id)
    .then((result) => {
      console.log('Updated product!')
      res.redirect('/admin/products')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId
  Product.findById(prodId)
    .then((product) => {
      if (!product) return next(new Error('Product Not Found.'))
      fileHelper.deleteFile(product.imageUrl)
      return Product.deleteById(prodId, req.session.user._id)
    })
    .then((result) => {
      console.log('Result', 'Destroied Product')
      // res.redirect('/admin/products')
      res.status(200).json({ message: 'Success!' })
    })
    .catch((err) => {
      res.status(500).json({ message: 'Deleting product failed.' })
    })
}
