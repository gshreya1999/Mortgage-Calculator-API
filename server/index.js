const express = require('express');
const mortgageRouter = require('./mortgage');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to BC Mortgage Calculator API!');
}); 

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.use('/api', mortgageRouter);
