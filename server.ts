// Imports
import dotenv from 'dotenv'; // .env reading
import express, { Application } from 'express'; // server establishing
import path from 'path'; // serving static files

// Routes
import datasetRoute from './routes/dataset';
import rootRoute from './routes/root';

// Controllers
import { appListen } from './controllers/appListen';

// App init
const app: Application = express()

// Config
app.use(express.json())
app.use('/', express.static(path.join(__dirname, 'public')))
dotenv.config()

// Defining env variables setup
const PORT: number = Number(process.env.PORT)

// REST
app.use('/', rootRoute)
app.use('/api/dataset', datasetRoute)

// Starting the server
app.listen(PORT, () => appListen(PORT))