const mongodb = require('mongodb')
const getDb = require('../util/database').getDb

class Product {
  // constructor(title, price, description, imageUrl, id, userId) {
  constructor(title, price, description, imageUrl, id, userId) {
    this.title = title
    this.price = price
    this.description = description
    this.imageUrl = imageUrl
    this._id = id ? new mongodb.ObjectId(id) : null
    // this.userId = userId._id.toString()
    this.userId = userId.toString()
    this.totalProducts
  }
  save(user_id = undefined) {
    const db = getDb()
    // let dbOp
    if (this._id) {
      // Update the product
      if (this.userId !== user_id.toString()) {
        console.log('Sorry, Unauthorized User to Edit Product')
        throw new Error('From save method')
      }
      return db
        .collection('products')
        .updateOne({ _id: this._id }, { $set: this })
        .catch((err) => console.log('Updating Error', err))
    } else {
      // console.log('This: ', this)
      // return Promise.resolve('')
      return db
        .collection('products')
        .insertOne(this)
        .catch((err) => {
          console.log('Inserting Error: ', err)
        })
    }
  }
  static getTotalProducts() {
    return this.totalProducts
  }
  static fetchAll(filter = {}, page = 0, ITEMS_PER_PAGE = 0) {
    // let totalProducts
    const db = getDb()
    return db
      .collection('products')
      .countDocuments()
      .then((numProducs) => {
        this.totalProducts = numProducs
        return db
          .collection('products')
          .find(filter)
          .skip((page - 1) * ITEMS_PER_PAGE)
          .limit(ITEMS_PER_PAGE)
          .toArray()
      })

      .then((products) => {
        // console.log('Products: ', products)
        return products
      })
      .catch((err) => {
        console.log('Error Find PRODUCTS: ', err)
      })
  }
  /**************************************************************** */
  static findById(prodId) {
    const db = getDb()
    return db.collection('products').findOne({
      _id: new mongodb.ObjectId(prodId),
    })
  }
  /**************************************************************** */

  static deleteById(prodId, userId = undefined) {
    // req.session.user._id
    const db = getDb()
    return (
      db
        .collection('products')
        // .findById({
        //   _id: new mongodb.ObjectId(prodId),
        //   userId: userId.toString(),
        // })
        // .then((product) => {
        //   fileHelper.deleteFile(product.imageUrl)
        //   // return product
        // })
        .deleteOne({
          _id: new mongodb.ObjectId(prodId),
          userId: userId.toString(),
        })
        .then((result) => {
          if (!result.deletedCount) {
            console.log('Sorry No Deletion')
            throw new Error()
          } else {
            console.log('Deleted')
          }
          // console.log('From deleteById', result)
        })
        .catch((err) => {
          console.log('Deleting Error', err)
          throw new Error(`Error from deleteById method, ${err}`)
        })
    )
  }
}

module.exports = Product
