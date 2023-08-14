const deleteProduct = (btn) => {
  const productId = btn.parentNode.querySelector('[name=productId]').value
  const csrf = btn.parentNode.querySelector('[name=_csrf]').value
  const productElement = btn.closest('article')

  fetch(`/admin/product/${productId}`, {
    method: 'DELETE',
    headers: {
      'csrf-token': csrf,
    },
  })
    .then((res) => {
      //   console.log('Result: ', res)
      return res.json()
    })
    .then((data) => {
      console.log('Data: ', data)
      productElement.parentNode.removeChild(productElement)
    })
    .catch((err) => {
      if (err) console.log('Error', err)
    })
}
