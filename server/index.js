const express = require('express')
const cors = require('cors')
const path = require('path')
const db = require('./db')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/screenshots', express.static(path.join(__dirname, '..', 'screenshots')))

app.use('/api/trades', require('./routes/trades'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/settings', require('./routes/settings'))

db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`Trading Journal API → http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('Failed to initialise database:', err)
    process.exit(1)
  })
