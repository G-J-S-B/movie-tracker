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
    password: "3L!Te1999!",
    port: 5432,
});

db.connect();

let currentUserId = 1;
let movieData = {};

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));

async function getMovieDetails(name, id)
{
    const apiUrl = 'http://www.omdbapi.com/';
    const apiKey = '?apikey=f8adfcaa';
    try
    {
        if (name && !id)
        {
            try
            {
                const movieName = `&t=${name}`;
                const response = await axios.get(apiUrl + apiKey + movieName);
                if (response.data.Error)
                {
                    const imdbid = `&i=${name}`;
                    const response = await axios.get(apiUrl + apiKey + imdbid);
                    return response.data;
                }
                else
                {
                    return response.data;
                }


            } catch (error)
            {
                console.error(error)
                return error
            }

        } else if (id && !name)
        {
            try
            {
                const imdbid = `&i=${id}`;
                const response = await axios.get(apiUrl + apiKey + imdbid);
                return response.data;
            } catch (error)
            {
                console.error(error)
                return error
            }

        } else
        {
            throw new Error("Either 'name' or 'imdbid' should be provided, but not both.");
        }
    } catch (error)
    {
        console.error("Error fetching movie details:", error);
        throw error; //
    }
}
async function getWatchedMovieListBasedOnId(id)
{
    let moviesImdbID;
    let moviesList = [];

    try
    {
        moviesImdbID = (await db.query('SELECT imdbid FROM watched_movies WHERE user_id = $1 ORDER BY id DESC;', [id])).rows;
    } catch (error)
    {
        console.error(error)
    }

    for (const row of moviesImdbID)
    {
        try
        {
            const apiUrl = 'http://www.omdbapi.com/';
            const apiKey = '?apikey=f8adfcaa';
            const imdbid = '&i=' + row.imdbid;

            const response = await axios.get(apiUrl + apiKey + imdbid);
            moviesList.push(response.data);
        } catch (error)
        {
            console.error(`Failed to fetch details for ${row.imdbid}:`, error);
        }
    }
    return moviesList;
}

async function getWatchListBasedOnId(id)
{
    let moviesImdbID;
    let moviesList = [];

    try
    {
        moviesImdbID = (await db.query('SELECT imdbid FROM to_watch WHERE user_id = $1 ORDER BY id DESC;', [id])).rows;
    } catch (error)
    {
        console.error(error)
    }

    for (const row of moviesImdbID)
    {
        try
        {
            const apiUrl = 'http://www.omdbapi.com/';
            const apiKey = '?apikey=f8adfcaa';
            const imdbid = '&i=' + row.imdbid;

            const response = await axios.get(apiUrl + apiKey + imdbid);
            moviesList.push(response.data);
        } catch (error)
        {
            console.error(`Failed to fetch details for ${row.imdbid}:`, error);
        }
    }
    return moviesList;
}

async function deleteWatchedMovieById(page, id)
{

    if (page == "watched-movies")
    {
        try
        {
            await db.query("DELETE FROM watched_movies WHERE imdbid=$1;", [id])
        } catch (error)
        {
            console.error(error)
        }
    }
    else if (page == "watch-list")
    {
        try
        {
            await db.query("DELETE FROM to_watch WHERE imdbid=$1;", [id])
        } catch (error)
        {
            console.error(error)
        }
    }
}

app.get('/', async (req, res) =>
{
    res.render('home.ejs')

});

app.get('/search', async (req, res) =>
{
    const movieName = req.query.movie_name;
    const movieImdbId = req.params.id;

    try
    {
        movieData = await getMovieDetails(movieName, movieImdbId);
    } catch (error)
    {
        console.error(error);

    }
    res.render('movie-details.ejs', { movieData, pagetype: 'new-movie' })
});

app.get('/watched-movies', async (req, res) =>
{
    const listType = "watched-movies";
    const pageTitle = "Watched Movies List"
    let moviesDetails = await getWatchedMovieListBasedOnId(currentUserId);
    res.render('movies-list.ejs', { moviesDetails, pagetype: 'view-movie', listType: listType, title: pageTitle })
});

app.get('/watch-list', async (req, res) =>
{
    const listType = "watch-list";
    const pageTitle = "Watch List"
    let moviesDetails = await getWatchListBasedOnId(currentUserId);
    res.render('movies-list.ejs', { moviesDetails, pagetype: 'view-movie', listType: listType, title: pageTitle })

});


app.get('/watched-movies/view/:id', async (req, res) =>
{
    const listType = "watched-movies";
    const pageTitle = "Watched Movies List"
    const movieName = req.query.movie_name;
    const movieImdbId = req.params.id;

    try
    {
        movieData = await getMovieDetails(movieName, movieImdbId);
    } catch (error)
    {
        console.error(error);
    }
    res.render('movie-details.ejs', { movieData, pagetype: 'view-movie', listType: listType, title: pageTitle })
});

app.get('/watch-list/view/:id', async (req, res) =>
{
    const listType = "watch-list";
    const pageTitle = "Watch List"
    const movieName = req.query.movie_name;
    const movieImdbId = req.params.id;

    try
    {
        movieData = await getMovieDetails(movieName, movieImdbId);
    } catch (error)
    {
        console.error(error);
    }
    res.render('movie-details.ejs', { movieData, pagetype: 'view-movie', listType: listType, title: pageTitle })
});


app.get('/add-to-watched', async (req, res) =>
{
    const userId = currentUserId;
    const movieId = movieData.imdbID;

    try
    {
        await db.query('INSERT INTO public.watched_movies(user_id, imdbid) VALUES ($1, $2)', [userId, movieId])
    } catch (error)
    {
        console.error(error);
    }
    res.redirect('/watched-movies')
})

app.get('/add-to-watchlist', async (req, res) =>
{
    const userId = currentUserId;
    const movieId = movieData.imdbID;

    try
    {
        await db.query('INSERT INTO public.to_watch(user_id, imdbid) VALUES ($1, $2)', [userId, movieId])
    } catch (error)
    {
        console.error(error);
        if (error.code == '23505')
        {
            res.render('error.ejs', { error: "This movie has already been added before." })
        }
    }
    res.redirect('/watch-list')
})

app.get('/watched-movies/delete/:id', async (req, res) =>
{
    const page = "watched-movies";
    const id = req.params.id;

    try
    {
        await deleteWatchedMovieById(page, id)
    } catch (error)
    {
        console.error(error)
    }


    res.redirect('/watched-movies')
})

app.get('/watch-list/delete/:id', async (req, res) =>
{
    const page = "watch-list";
    const id = req.params.id;

    try
    {
        await deleteWatchedMovieById(page, id)
    } catch (error)
    {
        console.error(error)
    }
    res.redirect('/watch-list')
})

app.listen(port, () =>
{
    console.log(`Server is running at http://localhost:${port}`);
});