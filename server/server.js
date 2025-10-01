const express = require('express')
const cors = require('cors')
const userRoutes = require('./routes/userRoutes')
const expenseRoutes = require('./routes/expenseRoutes')
const batchRoutes = require('./routes/cropBatchRoutes')
const connectDB = require('./config/db')

connectDB()
const app = express()
app.use(cors({ origin: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/users', userRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/batches', batchRoutes)

app.listen(4000, (err) => {
	if (err) throw err
	console.log('Server running on PORT 4000')
})
