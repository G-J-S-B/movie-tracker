import bodyParser from "body-parser";
import axios from 'axios';
import pg from 'pg';
import express, { query } from 'express';
import { fileURLToPath } from 'url'
import path from 'path';
import ejs from 'ejs'


const app = express();
const port = 3000;
const apiUrl= 'http://www.omdbapi.com/';
const apiKey = '?apikey=f8adfcaa';
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new pg.Client({

});

let movieData = {};

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) =>{
    res.render('index.ejs', {message: 'Hello World'})
});

app.get('/movie-details', (req ,res) => {
    res.render ('movie-details.ejs', {movieData})
})

app.post('/find-movie', (req, res) => {
    const movieName = '&t=' + req.body.search;
    axios.get(apiUrl + apiKey + movieName)
    .then(function (response) {
        movieData = response.data;
    })
    .catch(function (error) {
        console.error(error);
    })
    .finally(function () {
        res.redirect('/movie-details');
    });

})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
