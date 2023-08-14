const mongodb = require('mongodb')
const getDb = require('../util/database').getDb
class User {
  constructor(email, password, cart, id) {
    this.password = password
    this.email = email
    this.cart = cart
    this._id = id
  }

  addToCart(product) {
    const cartProductIndex = this.cart.items.findIndex((cp) => {
      return cp.productId.toString() === product._id.toString()
    })
    let newQuantity = 1
    const updatedCartItems = [...this.cart.items]

    if (cartProductIndex >= 0) {
      newQuantity = this.cart.items[cartProductIndex].quantity + 1
      updatedCartItems[cartProductIndex].quantity = newQuantity
    } else {
      updatedCartItems.push({
        productId: product._id,
        quantity: newQuantity,
      })
    }
    const updatedCart = {
      items: updatedCartItems,
    }
    const db = getDb()
    return db
      .collection('users')
      .updateOne(
        { _id: new mongodb.ObjectId(this._id) },
        { $set: { cart: updatedCart } }
      )
  }
  save() {
    const db = getDb()
    return db.collection('users').insertOne(this)
  }
  static findById(userId) {
    const db = getDb()
    return (
      db
        .collection('users')
        .findOne({ _id: new mongodb.ObjectId(userId) })
        // .findOne({ _id: userId })
        .then((user) => {
          // console.log('Finded User: ', user)
          return user
        })
        .catch((err) => {
          console.log('Finding user Error', err)
        })
    )
  }
  getCart() {
    const db = getDb()
    // console.log('This from getCart method in User Model: ', this.cart.items)
    const productIds = this.cart.items.map((i) => i.productId)
    return db
      .collection('products')
      .find({ _id: { $in: productIds } })
      .toArray()
      .then((products) =>
        products.map((p) => ({
          ...p,
          quantity: this.cart.items.find(
            (i) => i.productId.toString() === p._id.toString()
          ).quantity,
        }))
      )
  }
  deleteItemFromCart(productId) {
    const updatedCartItems = this.cart.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    )
    const db = getDb()
    return db
      .collection('users')
      .updateOne(
        { _id: this._id },
        { $set: { cart: { items: updatedCartItems } } }
      )
  }

  addOrder() {
    const db = getDb()
    return this.getCart()
      .then((products) => {
        const order = {
          items: products,
          user: {
            _id: new mongodb.ObjectId(this._id),
            email: this.email,
          },
        }
        return db.collection('orders').insertOne(order)
      })
      .then((result) => {
        this.cart = { items: [] }
        return db
          .collection('users')
          .updateOne({ _id: this._id }, { $set: { cart: { items: [] } } })
      })
  }

  getOrders() {
    const db = getDb()
    return db
      .collection('orders')
      .find({ 'user._id': new mongodb.ObjectId(this._id) })
      .toArray()
  }
}
module.exports = User
