const fs = require('fs')
const path = require('path')
const mongodb = require('mongodb')
const Product = require('../models/products')
const User = require('../models/user')
const getDb = require('../util/database').getDb
const PDFDocument = require('pdfkit')
const stripe = require('stripe')(process.env.STRIPE_KEY)

const ITEMS_PER_PAGE = 2
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1
  let totalProducts
  Product.fetchAll({}, page, ITEMS_PER_PAGE)
    .then((products) => {
      totalProducts = Product.getTotalProducts()
      // console.log('Products Length: ', totalProducts)
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getProduct = (req, res, next) => {
  let prodId = req.params.productId
  prodId = prodId.length === 24 ? prodId : null
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        res.redirect('/')
      } else {
        res.render('shop/product-detail', {
          product: product,
          pageTitle: product.title,
          path: '/products',
          isAuthenticated: req.session.isLoggedIn,
        })
      }
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postCart = (req, res, next) => {
  const { email, password, cart, _id } = req.session.user
  const user = new User(email, password, cart, _id)

  const prodId = req.body.productId
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        console.log('Product Not Found')
        return
      } else {
        // console.log('Product Found: ')
        return user.addToCart(product)
        //  res.redirect('/cart')
      }
    })
    .then((result) => {
      console.log('Result: ', result)
      res.redirect('/cart')
    })
    .catch((err) => {
      if (err) console.log('While Adding to Cart Error: ', err)
      res.redirect('/cart')
    })
}

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1
  let totalProducts
  Product.fetchAll({}, page, ITEMS_PER_PAGE)
    .then((products) => {
      totalProducts = Product.getTotalProducts()
      // console.log('Products Length: ', totalProducts)
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCart = (req, res, next) => {
  const user = req.session.user
  user
    .getCart()
    .then((products) => {
      // console.log('From getCart method, Cart Products: ', products)
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

// ***********************************************
exports.getOrders = (req, res, next) => {
  const { email, password, cart, _id } = req.session.user
  const user = new User(email, password, cart, _id)
  user
    .getOrders()
    .then((orders) => {
      return res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId
  const { email, password, cart, _id } = req.session.user
  const user = new User(email, password, cart, _id)

  user
    .deleteItemFromCart(prodId)
    .then((result) => {
      res.redirect('/cart')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCheckout = (req, res, next) => {
  let prods = []
  let total = 0
  const user = req.session.user
  user
    .getCart()
    .then((products) => {
      prods = products
      total = 0
      for (let product of products) {
        total += product.quantity * product.price
      }

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: 'usd',
              unit_amount: p.price * 100,
              product_data: {
                name: p.title,
                description: p.description,
              },
            },
            quantity: p.quantity,
          }
        }),
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
      })
    })
    .then((session) => {
      // console.log('Products from checkout: ', products)
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: prods,
        totalSum: total,
        sessionId: session.id,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCheckoutSuccess = (req, res, next) => {
  const { email, password, cart, _id } = req.session.user
  const user = new User(email, password, cart, _id)

  let fetchedCart
  user
    .addOrder()
    .then((result) => {
      res.redirect('/orders')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

// exports.postOrder = (req, res, next) => {
//   const { email, password, cart, _id } = req.session.user
//   const user = new User(email, password, cart, _id)

//   let fetchedCart
//   user
//     .addOrder()
//     .then((result) => {
//       res.redirect('/orders')
//     })
//     .catch((err) => {
//       const error = new Error(err)
//       error.httpStatusCode = 500
//       return next(error)
//     })
// }

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId
  const db = getDb()
  return db
    .collection('orders')
    .findOne({ _id: new mongodb.ObjectId(orderId) })
    .then((order) => {
      // console.log('Order Id: ', orderId)
      // console.log('Order: ', order)
      if (!order) return next(new Error('No Order Found'))
      // console.log('User ID: ', req.session.user._id.toString())
      if (order.user._id.toString() !== req.session.user._id.toString()) {
        return next(new Error('Unauthorizer'))
      }

      const invoiceName = 'invoice-' + orderId + '.pdf'
      const invoicePath = path.join('data', 'invoices', invoiceName)
      let totalPrice = 0

      const pdfDoc = new PDFDocument()
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename=${invoiceName}`)
      pdfDoc.pipe(fs.createWriteStream(invoicePath))
      pdfDoc.pipe(res)

      pdfDoc.fontSize(26).text('Invoice \n\n', {
        underline: true,
      })
      for (let i = 0; i < order.items.length; i++) {
        totalPrice += order.items[i].quantity * order.items[i].price
        pdfDoc
          .fontSize(14)
          .text(
            `(${i + 1}) ${order.items[i].title}: ${order.items[i].quantity} x ${
              order.items[i].price
            }$`
          )
      }
      pdfDoc.text('\n-------------------------------------------')
      pdfDoc.text(`Total Price: ${totalPrice}`)
      pdfDoc.end()
    })
    .catch((error) => {
      next(error)
    })
}
