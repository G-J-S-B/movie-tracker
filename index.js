import bodyParser from "body-parser";
import axios from 'axios';
import pg from 'pg';
import express, { query } from 'express';
import { fileURLToPath } from 'url'
import path from 'path';
import ejs from 'ejs'


const app = express();
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new pg.Client({
    host: 'localhost',
    database: "movie_tracker",
    user: "postgres",
    password:"3L!Te1999!",
    port: 5432,
});

db.connect();

let currentUserId = 1;
let movieData = {};

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'public')));

async function getMovieDetails(name, id) {
    const apiUrl = 'http://www.omdbapi.com/';
    const apiKey = '?apikey=f8adfcaa';
    try {
        if (name && !id) {
            const movieName = `&t=${name}`;
            const response = await axios.get(apiUrl + apiKey + movieName);
            return response.data;
        } else if (id && !name) {
            const imdbid = `&i=${id}`;
            const response = await axios.get(apiUrl + apiKey + imdbid);
            return response.data;
        } else {
            throw new Error("Either 'name' or 'imdbid' should be provided, but not both.");
        }
    } catch (error) {
        console.error("Error fetching movie details:", error);
        throw error; //
    }
}

async function getMovieDetailsBasedOnId(id) {
    let moviesImdbID;
    let moviesList = [];
    
    try {
        moviesImdbID = (await db.query('SELECT imdbid FROM watched_movies WHERE user_id = $1;', [id])).rows;
    } catch (error) {
        console.error(error)
    }

    moviesImdbID.forEach(async row => {
        const apiUrl = 'http://www.omdbapi.com/';
        const apiKey = '?apikey=f8adfcaa';
        const imdbid = '&i='+ row.imdbid;
        try {
            const response = await axios.get(apiUrl + apiKey + imdbid);
            moviesList.push(response.data);
        } catch (error) {
            console.error(error)
        }
    });

    return moviesList;
}


app.get('/', async (req, res) =>{
    let message = "Hello World!"
    res.render('index.ejs', {message})

    const moviesDetails = await getMovieDetailsBasedOnId(currentUserId);
    console.log (moviesDetails)
    
});


app.get('/search', async (req ,res) => {
    
    const movieName = req.query.movie_name; 
    const movieImdbId = req.params.id;

    try {
        movieData = await getMovieDetails(movieName, movieImdbId);
        res.render('movie-details.ejs', {movieData})
    } catch (error) {
        console.error(error);
    }  
});

app.get('/add-to-watched', async (req, res) => {
    const userId = currentUserId;
    const movieId = movieData.imdbID;

    console.log(userId);
    console.log(movieId)
    try {
        await db.query('INSERT INTO public.watched_movies(user_id, imdbid) VALUES ($1, $2)', [userId, movieId])
    } catch (error){
        console.error(error);
    }
    res.redirect('/')
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
