const express = require('express')
const cors = require('cors')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const userRoutes = require('./routes/userRoutes')
const expenseRoutes = require('./routes/expenseRoutes')
const batchRoutes = require('./routes/cropBatchRoutes')
const organizationRoutes = require('./routes/organizationRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const simulationRoutes = require('./routes/simulationRoutes')
const connectDB = require('./config/db')

connectDB()

const swaggerOptions = {
	swaggerDefinition: {
		openapi: '3.0.0',
		info: {
			title: 'Hydro Manager API',
			version: '1.0.0',
			description: 'API documentation for Hydroponic SaaS Application',
			contact: {
				name: 'Developer',
			},
			servers: ['http://localhost:4000'],
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	apis: ['./routes/*.js'],
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

const app = express()

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
app.use(cors({ origin: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/users', userRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/simulation', simulationRoutes)

const http = require('http')
const socketService = require('./utils/socket')

const server = http.createServer(app)
socketService.init(server)

server.listen(4000, (err) => {
	if (err) throw err
	console.log('Server running on PORT 4000')
})
