import dotenv from 'dotenv';
import connectDB from './db/connect.js';
import { app } from './app.js';

dotenv.config({
    path: './.env'
})


connectDB()
.then(() => {
    app.listen(process.env.PORT || 6000, () => {
        console.log(`Server is running on port ${process.env.PORT || 6000}`);
    })
})
.catch((error) => {
    console.log('Failed to connect to the database', error);
})